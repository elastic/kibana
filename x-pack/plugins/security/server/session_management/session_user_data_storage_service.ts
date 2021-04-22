/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from 'src/core/server';

import type { Session } from './session';
import { SessionUserDataStorage } from './session_user_data_storage';

export type SessionUserDataStorageScope = symbol;
export class SessionUserDataStorageService {
  readonly #scopes: Map<string, SessionUserDataStorageScope> = new Map();
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  registerScope(scopePrefix: string): SessionUserDataStorageScope {
    if (!scopePrefix) {
      throw new Error(`Scope prefix should be a valid non-empty string, but got ${scopePrefix}.`);
    }

    if (scopePrefix.includes('#')) {
      throw new Error('Scope prefix cannot contain `#` characters.');
    }

    const scopeLowerCase = scopePrefix.toLowerCase();
    if (this.#scopes.has(scopeLowerCase)) {
      throw new Error(`Scope with the "${scopeLowerCase}" prefix is already registered.`);
    }

    this.#logger.debug(`Registering session user data scope with the "${scopeLowerCase}" prefix.`);

    const scope = Object.freeze(Symbol(scopeLowerCase));
    this.#scopes.set(scopeLowerCase, scope);
    return scope;
  }

  getStorage(session: PublicMethodsOf<Readonly<Session>>, scope: SessionUserDataStorageScope) {
    const scopePrefix = this.getScopePrefix(scope);
    return Object.freeze(
      new SessionUserDataStorage(this.#logger.get('userData', scopePrefix), scopePrefix, session)
    );
  }

  private getScopePrefix(scope: SessionUserDataStorageScope) {
    const scopePrefix = scope.description;
    if (scopePrefix === undefined || this.#scopes.get(scopePrefix) !== scope) {
      throw new Error(`Scope "${scopePrefix}" is not valid.`);
    }

    return scopePrefix;
  }
}
