/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMTokensAdapter, TokenEnrollmentData } from './adapter_types';

export class MemoryTokensAdapter implements CMTokensAdapter {
  public async createEnrollmentToken(): Promise<TokenEnrollmentData> {
    return {
      token: '2jnwkrhkwuehriauhweair',
      expires_on: new Date().toJSON(),
    };
  }
}
