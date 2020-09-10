/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  SessionStorageFactory,
} from '../../../../../src/core/server';
import { ConfigType } from '../config';

/**
 * Represents shape of the session value stored in the cookie.
 */
export interface SessionCookieValue {
  /**
   * Unique session ID.
   */
  sid: string;

  /**
   * Unique random value used as Additional authenticated data (AAD) while encrypting/decrypting
   * sensitive or PII session content stored in the Elasticsearch index. This value is only stored
   * in the user cookie.
   */
  aad: string;

  /**
   * Kibana server base path the session was created for.
   */
  path: string;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the max lifespan is reached.
   */
  idleTimeoutExpiration: number | null;

  /**
   * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
   * time can be extended indefinitely.
   */
  lifespanExpiration: number | null;
}

export interface SessionCookieOptions {
  logger: Logger;
  serverBasePath: string;
  createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
  config: Pick<ConfigType, 'encryptionKey' | 'secureCookies' | 'cookieName' | 'sameSiteCookies'>;
}

export class SessionCookie {
  /**
   * Promise containing initialized cookie session storage factory.
   */
  private readonly cookieSessionValueStorage: Promise<
    SessionStorageFactory<Readonly<SessionCookieValue>>
  >;

  /**
   * Session cookie logger.
   */
  private readonly logger: Logger;

  /**
   * Base path of the Kibana server instance.
   */
  private readonly serverBasePath: string;

  constructor({
    config,
    createCookieSessionStorageFactory,
    logger,
    serverBasePath,
  }: Readonly<SessionCookieOptions>) {
    this.logger = logger;
    this.serverBasePath = serverBasePath;

    this.cookieSessionValueStorage = createCookieSessionStorageFactory({
      encryptionKey: config.encryptionKey,
      isSecure: config.secureCookies,
      name: config.cookieName,
      sameSite: config.sameSiteCookies,
      validate: (sessionValue: SessionCookieValue | SessionCookieValue[]) => {
        // ensure that this cookie was created with the current Kibana configuration
        const invalidSessionValue = (Array.isArray(sessionValue)
          ? sessionValue
          : [sessionValue]
        ).find((sess) => sess.path !== undefined && sess.path !== serverBasePath);

        if (invalidSessionValue) {
          this.logger.debug(`Outdated session value with path "${invalidSessionValue.path}"`);
          return { isValid: false, path: invalidSessionValue.path };
        }

        return { isValid: true };
      },
    });
  }

  /**
   * Extracts session value for the specified request.
   * @param request Request instance to get session value for.
   */
  async get(request: KibanaRequest) {
    const sessionStorage = (await this.cookieSessionValueStorage).asScoped(request);
    const sessionValue = await sessionStorage.get();

    // If we detect that cookie session value is in incompatible format, then we should clear such
    // cookie.
    if (sessionValue && !SessionCookie.isSupportedSessionValue(sessionValue)) {
      sessionStorage.clear();
      return null;
    }

    return sessionValue;
  }

  /**
   * Creates or updates session value for the specified request.
   * @param request Request instance to set session value for.
   * @param sessionValue Session value parameters.
   */
  async set(request: KibanaRequest, sessionValue: Readonly<Omit<SessionCookieValue, 'path'>>) {
    (await this.cookieSessionValueStorage)
      .asScoped(request)
      .set({ ...sessionValue, path: this.serverBasePath });
  }

  /**
   * Clears session value for the specified request.
   * @param request Request instance to clear session value for.
   */
  async clear(request: KibanaRequest) {
    (await this.cookieSessionValueStorage).asScoped(request).clear();
  }

  /**
   * Determines if session value was created by the current Kibana version. Previous versions had a different session value format.
   * @param sessionValue The session value to check.
   */
  private static isSupportedSessionValue(sessionValue: any): sessionValue is SessionCookieValue {
    return typeof sessionValue?.sid === 'string' && typeof sessionValue?.aad === 'string';
  }
}
