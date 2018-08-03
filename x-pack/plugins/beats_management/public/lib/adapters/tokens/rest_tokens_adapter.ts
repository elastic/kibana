/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RestAPIAdapter } from '../rest_api/adapter_types';
import { CMTokensAdapter, TokenEnrollmentData } from './adapter_types';

export class RestTokensAdapter implements CMTokensAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async createEnrollmentToken(): Promise<TokenEnrollmentData> {
    const tokens = await this.REST.post<TokenEnrollmentData[]>('/api/beats/enrollment_tokens');
    return tokens[0];
  }
}
