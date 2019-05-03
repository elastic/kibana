/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hapiAuthCookie from 'hapi-auth-cookie';
import { Legacy } from 'kibana';

const HAPI_STRATEGY_NAME = 'security-cookie';
// Forbid applying of Hapi authentication strategies to routes automatically.
const HAPI_STRATEGY_MODE = false;

/**
 * The shape of the session that is actually stored in the cookie.
 */
interface InternalSession {
  /**
   * Session value that is fed to the authentication provider. The shape is unknown upfront and
   * entirely determined by the authentication provider that owns the current session.
   */
  value: unknown;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the browser is closed.
   */
  expires: number | null;
}

function assertRequest(request: Legacy.Request) {
  if (!request || typeof request !== 'object') {
    throw new Error(`Request should be a valid object, was [${typeof request}].`);
  }
}

/**
 * Manages Kibana user session.
 */
export class Session {
  /**
   * Session duration in ms. If `null` session will stay active until the browser is closed.
   */
  private readonly ttl: number | null = null;

  /**
   * Instantiates Session. Constructor is not supposed to be used directly. To make sure that all
   * `Session` dependencies/plugins are properly initialized one should use static `Session.create` instead.
   * @param server Server instance.
   */
  constructor(private readonly server: Legacy.Server) {
    this.ttl = this.server.config().get<number | null>('xpack.security.sessionTimeout');
  }

  /**
   * Retrieves session value from the session storage (e.g. cookie).
   * @param request Request instance.
   */
  async get<T>(request: Legacy.Request) {
    assertRequest(request);

    try {
      const session = await this.server.auth.test(HAPI_STRATEGY_NAME, request);

      // If it's not an array, just return the session value
      if (!Array.isArray(session)) {
        return session.value as T;
      }

      // If we have an array with one value, we're good also
      if (session.length === 1) {
        return session[0].value as T;
      }

      // Otherwise, we have more than one and won't be authing the user because we don't
      // know which session identifies the actual user. There's potential to change this behavior
      // to ensure all valid sessions identify the same user, or choose one valid one, but this
      // is the safest option.
      const warning = `Found ${session.length} auth sessions when we were only expecting 1.`;
      this.server.log(['warning', 'security', 'auth', 'session'], warning);
      return null;
    } catch (err) {
      this.server.log(['debug', 'security', 'auth', 'session'], err);
      return null;
    }
  }

  /**
   * Puts current session value into the session storage.
   * @param request Request instance.
   * @param value Any object that will be associated with the request.
   */
  async set(request: Legacy.Request, value: unknown) {
    assertRequest(request);

    request.cookieAuth.set({
      value,
      expires: this.ttl && Date.now() + this.ttl,
    } as InternalSession);
  }

  /**
   * Clears current session.
   * @param request Request instance.
   */
  async clear(request: Legacy.Request) {
    assertRequest(request);

    request.cookieAuth.clear();
  }

  /**
   * Prepares and creates a session instance.
   * @param server Server instance.
   */
  static async create(server: Legacy.Server) {
    // Register HAPI plugin that manages session cookie and delegate parsing of the session cookie to it.
    await server.register({
      plugin: hapiAuthCookie,
    });

    const config = server.config();
    const httpOnly = true;
    const name = config.get<string>('xpack.security.cookieName');
    const password = config.get<string>('xpack.security.encryptionKey');
    const path = `${config.get<string | undefined>('server.basePath')}/`;
    const secure = config.get<boolean>('xpack.security.secureCookies');

    server.auth.strategy(HAPI_STRATEGY_NAME, 'cookie', {
      cookie: name,
      password,
      clearInvalid: true,
      validateFunc: Session.validateCookie,
      isHttpOnly: httpOnly,
      isSecure: secure,
      isSameSite: false,
      path,
    });

    if (HAPI_STRATEGY_MODE) {
      server.auth.default({
        strategy: HAPI_STRATEGY_NAME,
        mode: 'required',
      });
    }

    return new Session(server);
  }

  /**
   * Validation function that is passed to hapi-auth-cookie plugin and is responsible
   * only for cookie expiration time validation.
   * @param request Request instance.
   * @param session Session value object retrieved from cookie.
   */
  private static validateCookie(request: Legacy.Request, session: InternalSession) {
    if (session.expires && session.expires < Date.now()) {
      return { valid: false };
    }

    return { valid: true };
  }
}
