/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { promisify } from 'util';
import { randomBytes, createHash } from 'crypto';
import nodeCrypto, { Crypto } from '@elastic/node-crypto';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { KibanaRequest, Logger } from '../../../../../src/core/server';
import type { AuthenticationProvider } from '../../common/model';
import type { ConfigType } from '../config';
import type { SessionIndex, SessionIndexValue } from './session_index';
import type { SessionCookie } from './session_cookie';

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
  readonly logger: Logger;
  readonly sessionIndex: PublicMethodsOf<SessionIndex>;
  readonly sessionCookie: PublicMethodsOf<SessionCookie>;
  readonly config: Pick<ConfigType, 'encryptionKey' | 'session'>;
}

export interface SessionValueContentToEncrypt {
  username?: string;
  state: unknown;
}

/**
 * The SIDs and AAD must be unpredictable to prevent guessing attacks, where an attacker is able to
 * guess or predict the ID of a valid session through statistical analysis techniques. That's why we
 * generate SIDs and AAD using a secure PRNG and current OWASP guidance suggests a minimum of 16
 * bytes (128 bits), but to be on the safe side we decided to use 32 bytes (256 bits).
 */
const SID_BYTE_LENGTH = 32;
const AAD_BYTE_LENGTH = 32;

export class Session {
  /**
   * Used to encrypt and decrypt portion of the session value using configured encryption key.
   */
  private readonly crypto: Crypto;

  /**
   * Promise-based version of the NodeJS native `randomBytes`.
   */
  private readonly randomBytes = promisify(randomBytes);

  constructor(private readonly options: Readonly<SessionOptions>) {
    this.crypto = nodeCrypto({ encryptionKey: this.options.config.encryptionKey });
  }

  /**
   * Extracts session value for the specified request. Under the hood it can clear session if it is
   * invalid or created by the legacy versions of Kibana.
   * @param request Request instance to get session value for.
   */
  async get(request: KibanaRequest) {
    const sessionCookieValue = await this.options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      return null;
    }

    const sessionLogger = this.getLoggerForSID(sessionCookieValue.sid);
    const now = Date.now();
    if (
      (sessionCookieValue.idleTimeoutExpiration &&
        sessionCookieValue.idleTimeoutExpiration < now) ||
      (sessionCookieValue.lifespanExpiration && sessionCookieValue.lifespanExpiration < now)
    ) {
      sessionLogger.debug('Session has expired and will be invalidated.');
      await this.clear(request);
      return null;
    }

    const sessionIndexValue = await this.options.sessionIndex.get(sessionCookieValue.sid);
    if (!sessionIndexValue) {
      sessionLogger.debug(
        'Session value is not available in the index, session cookie will be invalidated.'
      );
      await this.options.sessionCookie.clear(request);
      return null;
    }

    let decryptedContent: SessionValueContentToEncrypt;
    try {
      decryptedContent = JSON.parse(
        (await this.crypto.decrypt(sessionIndexValue.content, sessionCookieValue.aad)) as string
      );
    } catch (err) {
      sessionLogger.warn(
        `Unable to decrypt session content, session will be invalidated: ${err.message}`
      );
      await this.clear(request);
      return null;
    }

    return {
      ...Session.sessionIndexValueToSessionValue(sessionIndexValue, decryptedContent),
      // Unlike session index, session cookie contains the most up to date idle timeout expiration.
      idleTimeoutExpiration: sessionCookieValue.idleTimeoutExpiration,
    };
  }

  /**
   * Creates new session document in the session index encrypting sensitive state.
   * @param request Request instance to create session value for.
   * @param sessionValue Session value parameters.
   */
  async create(
    request: KibanaRequest,
    sessionValue: Readonly<
      Omit<SessionValue, 'sid' | 'idleTimeoutExpiration' | 'lifespanExpiration' | 'metadata'>
    >
  ) {
    const [sid, aad] = await Promise.all([
      this.randomBytes(SID_BYTE_LENGTH).then((sidBuffer) => sidBuffer.toString('base64')),
      this.randomBytes(AAD_BYTE_LENGTH).then((aadBuffer) => aadBuffer.toString('base64')),
    ]);

    const sessionLogger = this.getLoggerForSID(sid);
    sessionLogger.debug('Creating a new session.');

    const sessionExpirationInfo = this.calculateExpiry(sessionValue.provider);
    const { username, state, ...publicSessionValue } = sessionValue;

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    const sessionIndexValue = await this.options.sessionIndex.create({
      ...publicSessionValue,
      ...sessionExpirationInfo,
      sid,
      usernameHash: username && createHash('sha3-256').update(username).digest('hex'),
      content: await this.crypto.encrypt(JSON.stringify({ username, state }), aad),
    });

    await this.options.sessionCookie.set(request, { ...sessionExpirationInfo, sid, aad });

    sessionLogger.debug('Successfully created a new session.');

    return Session.sessionIndexValueToSessionValue(sessionIndexValue, { username, state });
  }

  /**
   * Creates or updates session value for the specified request.
   * @param request Request instance to set session value for.
   * @param sessionValue Session value parameters.
   */
  async update(request: KibanaRequest, sessionValue: Readonly<SessionValue>) {
    const sessionCookieValue = await this.options.sessionCookie.get(request);
    const sessionLogger = this.getLoggerForSID(sessionValue.sid);
    if (!sessionCookieValue) {
      sessionLogger.warn('Session cannot be updated since it does not exist.');
      return null;
    }

    const sessionExpirationInfo = this.calculateExpiry(
      sessionValue.provider,
      sessionCookieValue.lifespanExpiration
    );
    const { username, state, metadata, ...publicSessionInfo } = sessionValue;

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    const sessionIndexValue = await this.options.sessionIndex.update({
      ...sessionValue.metadata.index,
      ...publicSessionInfo,
      ...sessionExpirationInfo,
      usernameHash: username && createHash('sha3-256').update(username).digest('hex'),
      content: await this.crypto.encrypt(
        JSON.stringify({ username, state }),
        sessionCookieValue.aad
      ),
    });

    // Session may be already invalidated by another concurrent request, in this case we should
    // clear cookie for the request as well.
    if (sessionIndexValue === null) {
      sessionLogger.warn('Session cannot be updated as it has been invalidated already.');
      await this.options.sessionCookie.clear(request);
      return null;
    }

    await this.options.sessionCookie.set(request, {
      ...sessionCookieValue,
      ...sessionExpirationInfo,
    });

    sessionLogger.debug('Successfully updated existing session.');

    return Session.sessionIndexValueToSessionValue(sessionIndexValue, { username, state });
  }

  /**
   * Extends existing session.
   * @param request Request instance to set session value for.
   * @param sessionValue Session value parameters.
   */
  async extend(request: KibanaRequest, sessionValue: Readonly<SessionValue>) {
    const sessionCookieValue = await this.options.sessionCookie.get(request);
    const sessionLogger = this.getLoggerForSID(sessionValue.sid);
    if (!sessionCookieValue) {
      sessionLogger.warn('Session cannot be extended since it does not exist.');
      return null;
    }

    // We calculate actual expiration values based on the information extracted from the portion of
    // the session value that is stored in the cookie since it always contains the most recent value.
    const sessionExpirationInfo = this.calculateExpiry(
      sessionValue.provider,
      sessionCookieValue.lifespanExpiration
    );
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
      sessionLogger.debug(
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
      sessionLogger.debug(
        'Session lifespan configuration has changed, session index will be updated.'
      );
      updateSessionIndex = true;
    } else {
      // The timeout after which we update index is two times longer than configured idle timeout
      // since index updates are costly and we want to minimize them.
      const { idleTimeout } = this.options.config.session.getExpirationTimeouts(
        sessionValue.provider
      );
      if (
        idleTimeout !== null &&
        idleTimeout.asMilliseconds() * 2 <
          sessionExpirationInfo.idleTimeoutExpiration! -
            sessionValue.metadata.index.idleTimeoutExpiration!
      ) {
        // 3. If idle timeout was updated a while ago.
        sessionLogger.debug(
          'Session idle timeout stored in the index is too old and will be updated.'
        );
        updateSessionIndex = true;
      }
    }

    // First try to store session in the index and only then in the cookie to make sure cookie is
    // only updated if server side session is created successfully.
    if (updateSessionIndex) {
      const sessionIndexValue = await this.options.sessionIndex.update({
        ...sessionValue.metadata.index,
        ...sessionExpirationInfo,
      });

      // Session may be already invalidated by another concurrent request, in this case we should
      // clear cookie for the request as well.
      if (sessionIndexValue === null) {
        sessionLogger.warn('Session cannot be extended as it has been invalidated already.');
        await this.options.sessionCookie.clear(request);
        return null;
      }

      sessionValue.metadata.index = sessionIndexValue;
    }

    await this.options.sessionCookie.set(request, {
      ...sessionCookieValue,
      ...sessionExpirationInfo,
    });

    sessionLogger.debug('Successfully extended existing session.');

    return { ...sessionValue, ...sessionExpirationInfo } as Readonly<SessionValue>;
  }

  /**
   * Clears session value for the specified request.
   * @param request Request instance to clear session value for.
   */
  async clear(request: KibanaRequest) {
    const sessionCookieValue = await this.options.sessionCookie.get(request);
    if (!sessionCookieValue) {
      return;
    }

    const sessionLogger = this.getLoggerForSID(sessionCookieValue.sid);
    sessionLogger.debug('Invalidating session.');

    await Promise.all([
      this.options.sessionCookie.clear(request),
      this.options.sessionIndex.clear(sessionCookieValue.sid),
    ]);

    sessionLogger.debug('Successfully invalidated session.');
  }

  private calculateExpiry(
    provider: AuthenticationProvider,
    currentLifespanExpiration?: number | null
  ): { idleTimeoutExpiration: number | null; lifespanExpiration: number | null } {
    const now = Date.now();
    const { idleTimeout, lifespan } = this.options.config.session.getExpirationTimeouts(provider);

    // if we are renewing an existing session, use its `lifespanExpiration` -- otherwise, set this value
    // based on the configured server `lifespan`.
    // note, if the server had a `lifespan` set and then removes it, remove `lifespanExpiration` on renewed sessions
    // also, if the server did not have a `lifespan` set and then adds it, add `lifespanExpiration` on renewed sessions
    const lifespanExpiration =
      currentLifespanExpiration && lifespan
        ? currentLifespanExpiration
        : lifespan && now + lifespan.asMilliseconds();
    const idleTimeoutExpiration = idleTimeout && now + idleTimeout.asMilliseconds();

    return { idleTimeoutExpiration, lifespanExpiration };
  }

  /**
   * Converts value retrieved from the index to the value returned to the API consumers.
   * @param sessionIndexValue The value returned from the index.
   * @param decryptedContent Decrypted session value content.
   */
  private static sessionIndexValueToSessionValue(
    sessionIndexValue: Readonly<SessionIndexValue>,
    { username, state }: SessionValueContentToEncrypt
  ): Readonly<SessionValue> {
    // Extract values that are specific to session index value.
    const { usernameHash, content, ...publicSessionValue } = sessionIndexValue;
    return { ...publicSessionValue, username, state, metadata: { index: sessionIndexValue } };
  }

  /**
   * Creates logger scoped to a specified session ID.
   * @param sid Session ID to create logger for.
   */
  private getLoggerForSID(sid: string) {
    return this.options.logger.get(sid?.slice(-10));
  }
}
