/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RestAPIAdapter } from '../rest_api/adapter_types';
import { CMTokensAdapter } from './adapter_types';

export class RestTokensAdapter implements CMTokensAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async createEnrollmentToken(): Promise<string> {
    const tokens = (await this.REST.post<{ tokens: string[] }>('/api/beats/enrollment_tokens'))
      .tokens;
    return tokens[0];
  }
}
