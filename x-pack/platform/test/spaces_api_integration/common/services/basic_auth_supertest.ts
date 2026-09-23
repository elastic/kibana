/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Test } from 'supertest';

import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';

import type { TestDefinitionAuthentication as User } from '../lib/types';

export class SupertestWithBasicAuth {
  private readonly supertestWithoutAuth: SupertestWithoutAuthProviderType;
  private readonly user: User;
  private readonly requestTimeout?: number;

  constructor(
    supertestWithoutAuth: SupertestWithoutAuthProviderType,
    user: User,
    requestTimeout?: number
  ) {
    this.supertestWithoutAuth = supertestWithoutAuth;
    this.user = user;
    this.requestTimeout = requestTimeout;
  }

  async destroy() {}

  private request(method: 'post' | 'get' | 'put' | 'delete' | 'patch', url: string): Test {
    const agent = this.supertestWithoutAuth[method](url);

    // Bound the request so a stalled connection fails here rather than consuming the
    // enclosing mocha timeout and aborting the whole FTR config.
    if (this.requestTimeout) {
      void agent.timeout(this.requestTimeout);
    }

    if (this.user) {
      agent.auth(this.user.username!, this.user.password!);
    }

    return agent;
  }

  post(url: string) {
    return this.request('post', url);
  }

  get(url: string) {
    return this.request('get', url);
  }

  put(url: string) {
    return this.request('put', url);
  }

  delete(url: string) {
    return this.request('delete', url);
  }

  patch(url: string) {
    return this.request('patch', url);
  }
}
