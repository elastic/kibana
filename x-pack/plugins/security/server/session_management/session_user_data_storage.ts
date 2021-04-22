/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { KibanaRequest, Logger } from 'src/core/server';

import type { Session } from './session';

/**
 * Session user data storage allows to manage any custom data associated with the session.
 */
export class SessionUserDataStorage {
  readonly #scopePrefix: string;
  readonly #session: PublicMethodsOf<Readonly<Session>>;
  readonly #logger: Logger;

  constructor(logger: Logger, scopePrefix: string, session: PublicMethodsOf<Readonly<Session>>) {
    this.#logger = logger;
    this.#scopePrefix = scopePrefix;
    this.#session = session;
  }

  /**
   * Retrieves user data from the session by the specified key. If requested value isn't found, or
   * there is no active session, this method with return `null`.
   * @param request Request used to get the session for.
   * @param key Unique key associated with the data to retrieve.
   */
  async get<TValue = unknown>(request: KibanaRequest, key: string) {
    this.#logger.debug(`Retrieving user data for key ${key}.`);
    const sessionValue = await this.#session.get(request);
    return (sessionValue?.userData?.get(`${this.#scopePrefix}#${key}`) as TValue) ?? null;
  }

  /**
   * Stores provided value as the part of the session user data by the specified key.
   * @param request Request used to get the session for.
   * @param key Unique key associated with the data to store.
   * @param value A JSON-serializable data to store.
   * @throws This method will throw if there is no active session.
   */
  async set(request: KibanaRequest, key: string, value: unknown) {
    this.#logger.debug(`Setting user data for key ${key}.`);

    const sessionValue = await this.#session.get(request);
    if (!sessionValue) {
      throw new Error('Request does not have associated user session.');
    }

    if (!sessionValue.userData) {
      sessionValue.userData = new Map();
    }

    sessionValue.userData.set(`${this.#scopePrefix}#${key}`, value);
    await this.#session.update(request, sessionValue);
  }

  /**
   * Removes user data from the session by the specified key. It's a no-op if the key isn't found,
   * or there is no active session.
   * @param request Request used to get the session for.
   * @param key Unique key associated with the data to remove.
   */
  async remove(request: KibanaRequest, key: string) {
    this.#logger.debug(`Removing user data for key ${key}.`);

    const sessionValue = await this.#session.get(request);
    const dataKey = `${this.#scopePrefix}#${key}`;
    if (sessionValue?.userData?.has(dataKey) !== true) {
      return;
    }

    sessionValue.userData.delete(dataKey);
    await this.#session.update(request, sessionValue);
  }
}
