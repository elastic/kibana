/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';

interface SecurityContext {
  rbac: boolean;
  legacy: boolean;
}

export class SecurityContextService {
  private readonly cache: WeakMap<any, SecurityContext>;

  constructor() {
    this.cache = new WeakMap();
  }

  protected set(request: any, value: SecurityContext) {
    if (this.cache.has(request) && !isEqual(this.cache.get(request), value)) {
      throw new Error(`Unable to change the security context after it's been set`);
    }

    this.cache.set(request, value);
  }

  protected get(request: any) {
    if (!this.cache.has(request)) {
      throw new Error('Security context has not been set');
    }

    return this.cache.get(request);
  }
}
