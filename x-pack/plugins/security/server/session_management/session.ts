/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto, { Crypto } from '@elastic/node-crypto';
import { promisify } from 'util';
import { randomBytes, createHash } from 'crypto';
import { Duration } from 'moment';
import { KibanaRequest, Logger } from '../../../../../src/core/server';
import { AuthenticationProvider } from '../../common/types';
import { SecurityAuditLogger } from '../audit';
import { ConfigType } from '../config';
import { SessionIndex, SessionIndexValue } from './session_index';
import { SessionCookie } from './session_cookie';

/**
 * The shape of the value that represents user's session information.
 */
export interface SessionValue {
  /**
   * Unique session ID.
   */
  sid: string;

  /**
   * Username this session belongs. It's defined only if session is authenticated, otherwise session
   * is considered unauthenticated (e.g. intermediate session used during SSO handshake).
   */
  username?: string;

  /**
   * Name and type of the provider this session belongs to.
   */
  provider: AuthenticationProvider;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the browser is closed.
   */
  idleTimeoutExpiration: number | null;

  /**
   * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
   * time can be extended indefinitely.
   */
  lifespanExpiration: number | null;

  /**
   * Kibana server base path the session was created for.
   */
  path: string;

  /**
   * Session value that is fed to the authentication provider. The shape is unknown upfront and
   * entirely determined by the authentication provider that owns the current session.
   */
  state: unknown;

  /**
   * Indicates whether user acknowledged access agreement or not.
   */
  accessAgreementAcknowledged?: boolean;

  /**
   * Additional information about the session value.
   */
  metadata: { index: SessionIndexValue };
}

export interface SessionOptions {
  auditLogger: SecurityAuditLogger;
  serverBasePath: string;
  logger: Logger;
  sessionIndex: SessionIndex;
  sessionCookie: SessionCookie;
  config: Pick<ConfigType, 'encryptionKey' | 'session'>;
}

interface SessionValueContentToEncrypt {
  username?: string;
  state: unknown;
}

export class Session {
  /**
   * Session timeout in ms. If `null` session will stay active until the browser is closed.
   */
  readonly #idleTimeout: Duration | null;

  /**
   * Timeout after which idle timeout property is updated in the index. It's two times longer than
   * configured idle timeout since index updates are costly and we want to minimize them.
   */
  readonly #idleIndexUpdateTimeout: number | null;

  /**
   * Session max lifespan in ms. If `null` session may live indefinitely.
   */
  readonly #lifespan: Duration | null;

  /**
   * Used to encrypt and decrypt portion of the session value using configured encryption key.
   */
  readonly #crypto: Crypto;

  /**
   * Promise-based version of the NodeJS native `randomBytes`.
   */
  readonly #randomBytes = promisify(randomBytes);

  /**
   * Options used to create Session.
   */
  readonly #options: Readonly<SessionOptions>;

  constructor(options: Readonly<SessionOptions>) {
    this.#options = options;
    this.#crypto = nodeCrypto({ encryptionKey: this.#options.config.encryptionKey });
    this.#idleTimeout = this.#options.config.session.idleTimeout;
    this.#lifespan = this.#options.config.session.lifespan;
    this.#idleIndexUpdateTimeout = this.#options.config.session.idleTimeout
      ? this.#options.config.session.idleTimeout.asMilliseconds() * 2
      : null;
  }

  /**
   * Extracts session value for the specified request. Under the hood it can clear session if it is
   * invalid or created by the legacy versions of Kibana.
   * @param request Request instance to get session value for.
   */
  async get(request: KibanaRequest) {
    const sessionCookieValue = await this.#options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      return null;
    }

    if (
      (sessionCookieValue.idleTimeoutExpiration &&
        sessionCookieValue.idleTimeoutExpiration < Date.now()) ||
      (sessionCookieValue.lifespanExpiration && sessionCookieValue.lifespanExpiration < Date.now())
    ) {
      this.#options.logger.debug('Session has expired and will be invalidated.');
      await this.clear(request);
      return null;
    }

    const sessionIndexValue = await this.#options.sessionIndex.get(sessionCookieValue.sid);
    if (!sessionIndexValue) {
      this.#options.logger.debug(
        'Session value is not available in the index, session cookie will be invalidated.'
      );
      await this.clear(request);
      return null;
    }

    try {
      return {
        ...(await this.decryptSessionValue(sessionIndexValue, sessionCookieValue.aad)),
        // Unlike session index, session cookie contains the most up to date idle timeout expiration.
        idleTimeoutExpiration: sessionCookieValue.idleTimeoutExpiration,
      };
    } catch (err) {
      this.#options.logger.warn('Unable to decrypt session content, session will be invalidated.');
      await this.clear(request);
      return null;
    }
  }

  /**
   * Creates new session document in the session index encrypting sensitive state.
   * @param request Request instance to create session value for.
   * @param sessionValue Session value parameters.
   */
  async create(
    request: KibanaRequest,
    sessionValue: Readonly<
      Omit<
        SessionValue,
        'sid' | 'idleTimeoutExpiration' | 'lifespanExpiration' | 'path' | 'metadata'
      >
    >
  ) {
    // Do we want to partition these calls or merge in a single 512 call instead? Technically 512
    // will be faster, and we'll occupy just one thread.
    const [sid, aad] = await Promise.all([
      this.#randomBytes(256).then((sidBuffer) => sidBuffer.toString('base64')),
      this.#randomBytes(256).then((aadBuffer) => aadBuffer.toString('base64')),
    ]);

    const sessionExpirationInfo = this.calculateExpiry();
    const path = this.#options.serverBasePath;
    const createdSessionValue = { ...sessionValue, ...sessionExpirationInfo, sid, path };

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    const sessionIndexValue = await this.#options.sessionIndex.create(
      await this.encryptSessionValue(createdSessionValue, aad)
    );
    await this.#options.sessionCookie.set(request, { ...sessionExpirationInfo, sid, aad, path });

    this.#options.logger.debug('Successfully created new session.');

    return { ...createdSessionValue, metadata: { index: sessionIndexValue } } as Readonly<
      SessionValue
    >;
  }

  /**
   * Creates or updates session value for the specified request.
   * @param request Request instance to set session value for.
   * @param sessionValue Session value parameters.
   */
  async update(request: KibanaRequest, sessionValue: Readonly<SessionValue>) {
    const sessionCookieValue = await this.#options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      throw new Error('Session cannot be update since it doesnt exist.');
    }

    const sessionExpirationInfo = this.calculateExpiry(sessionCookieValue.lifespanExpiration);
    const { metadata, ...sessionValueToUpdate } = sessionValue;
    const updatedSessionValue = {
      ...sessionValueToUpdate,
      ...sessionExpirationInfo,
      path: this.#options.serverBasePath,
    };

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    const sessionIndexValue = await this.#options.sessionIndex.update({
      ...sessionValue.metadata.index,
      ...(await this.encryptSessionValue(updatedSessionValue, sessionCookieValue.aad)),
    });

    // Session may be already invalidated by another concurrent request, in this case we should
    // clear cookie for the request as well.
    if (sessionIndexValue === null) {
      this.#options.logger.warn('Session cannot be updated as it has been invalidated already.');
      await this.#options.sessionCookie.clear(request);
      return null;
    }

    await this.#options.sessionCookie.set(request, {
      ...sessionCookieValue,
      ...sessionExpirationInfo,
    });

    this.#options.logger.debug('Successfully updated existing session.');

    return { ...updatedSessionValue, metadata: { index: sessionIndexValue } } as Readonly<
      SessionValue
    >;
  }

  /**
   * Extends existing session.
   * @param request Request instance to set session value for.
   * @param sessionValue Session value parameters.
   */
  async extend(request: KibanaRequest, sessionValue: Readonly<SessionValue>) {
    const sessionCookieValue = await this.#options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      throw new Error('Session cannot be extended since it doesnt exist.');
    }

    // We calculate actual expiration values based on the information extracted from the portion of
    // the session value that is stored in the cookie since it always contains the most recent value.
    const sessionExpirationInfo = this.calculateExpiry(sessionCookieValue.lifespanExpiration);
    if (
      sessionExpirationInfo.idleTimeoutExpiration === sessionValue.idleTimeoutExpiration &&
      sessionExpirationInfo.lifespanExpiration === sessionValue.lifespanExpiration
    ) {
      return sessionValue;
    }

    // Session index updates are costly and should be minimized, but these are the cases when we
    // should update session index:
    let updateSessionIndex = false;
    if (
      (sessionExpirationInfo.idleTimeoutExpiration === null &&
        sessionValue.idleTimeoutExpiration !== null) ||
      (sessionExpirationInfo.idleTimeoutExpiration !== null &&
        sessionValue.idleTimeoutExpiration === null)
    ) {
      // 1. If idle timeout wasn't configured when session was initially created and is configured
      // now or vice versa.
      this.#options.logger.debug(
        'Session idle timeout configuration has changed, session index will be updated.'
      );
      updateSessionIndex = true;
    } else if (
      (sessionExpirationInfo.lifespanExpiration === null &&
        sessionValue.lifespanExpiration !== null) ||
      (sessionExpirationInfo.lifespanExpiration !== null &&
        sessionValue.lifespanExpiration === null)
    ) {
      // 2. If lifespan wasn't configured when session was initially created and is configured now
      // or vice versa.
      this.#options.logger.debug(
        'Session lifespan configuration has changed, session index will be updated.'
      );
      updateSessionIndex = true;
    } else if (
      this.#idleIndexUpdateTimeout !== null &&
      this.#idleIndexUpdateTimeout <
        sessionExpirationInfo.idleTimeoutExpiration! - sessionValue.idleTimeoutExpiration!
    ) {
      // 3. If idle timeout was updated a while ago.
      this.#options.logger.debug(
        'Session idle timeout stored in the index is too old and will be updated.'
      );
      updateSessionIndex = true;
    }

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    if (updateSessionIndex) {
      const sessionIndexValue = await this.#options.sessionIndex.update({
        ...sessionValue.metadata.index,
        ...sessionExpirationInfo,
      });

      // Session may be already invalidated by another concurrent request, in this case we should
      // clear cookie for the request as well.
      if (sessionIndexValue === null) {
        this.#options.logger.warn('Session cannot be extended as it has been invalidated already.');
        await this.#options.sessionCookie.clear(request);
        return null;
      }

      sessionValue.metadata.index = sessionIndexValue;
    }

    await this.#options.sessionCookie.set(request, {
      ...sessionCookieValue,
      ...sessionExpirationInfo,
    });

    this.#options.logger.debug('Successfully extended existing session.');

    return { ...sessionValue, ...sessionExpirationInfo } as Readonly<SessionValue>;
  }

  /**
   * Clears session value for the specified request.
   * @param request Request instance to clear session value for.
   */
  async clear(request: KibanaRequest) {
    const sessionCookieValue = await this.#options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      return null;
    }

    await Promise.all([
      this.#options.sessionCookie.clear(request),
      this.#options.sessionIndex.clear(sessionCookieValue.sid),
    ]);

    this.#options.logger.debug('Successfully invalidated existing session.');
  }

  /**
   * Encrypts session value content and converts to a value stored in the session index.
   * @param sessionValue Session value.
   * @param aad Additional authenticated data (AAD) used for encryption.
   */
  private async encryptSessionValue(
    sessionValue: Readonly<Omit<SessionValue, 'metadata'>>,
    aad: string
  ) {
    // Extract values that shouldn't be directly included into session index value.
    const { username, state, ...sessionIndexValue } = sessionValue;

    try {
      const encryptedContent = await this.#crypto.encrypt(
        JSON.stringify({ username, state } as SessionValueContentToEncrypt),
        aad
      );
      return {
        ...sessionIndexValue,
        username_hash: username && createHash('sha3-256').update(username).digest('hex'),
        content: encryptedContent,
      };
    } catch (err) {
      this.#options.logger.error(`Failed to encrypt session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Decrypts session value content from the value stored in the session index.
   * @param sessionIndexValue Session value retrieved from the session index.
   * @param aad Additional authenticated data (AAD) used for decryption.
   */
  private async decryptSessionValue(sessionIndexValue: Readonly<SessionIndexValue>, aad: string) {
    // Extract values that are specific to session index value.
    const { username_hash, content, ...sessionValue } = sessionIndexValue;

    try {
      const decryptedContent = JSON.parse(
        (await this.#crypto.decrypt(content, aad)) as string
      ) as SessionValueContentToEncrypt;
      return {
        ...sessionValue,
        ...decryptedContent,
        metadata: { index: sessionIndexValue },
      } as Readonly<SessionValue>;
    } catch (err) {
      this.#options.logger.error(`Failed to decrypt session value: ${err.message}`);
      throw err;
    }
  }

  private calculateExpiry(
    currentLifespanExpiration?: number | null
  ): { idleTimeoutExpiration: number | null; lifespanExpiration: number | null } {
    const now = Date.now();
    // if we are renewing an existing session, use its `lifespanExpiration` -- otherwise, set this value
    // based on the configured server `lifespan`.
    // note, if the server had a `lifespan` set and then removes it, remove `lifespanExpiration` on renewed sessions
    // also, if the server did not have a `lifespan` set and then adds it, add `lifespanExpiration` on renewed sessions
    const lifespanExpiration =
      currentLifespanExpiration && this.#lifespan
        ? currentLifespanExpiration
        : this.#lifespan && now + this.#lifespan.asMilliseconds();
    const idleTimeoutExpiration = this.#idleTimeout && now + this.#idleTimeout.asMilliseconds();

    return { idleTimeoutExpiration, lifespanExpiration };
  }
}
