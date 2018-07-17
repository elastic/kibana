/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { DatabaseAdapter } from '../database/adapter_types';
import { BackendFrameworkAdapter, FrameworkUser } from '../framework/adapter_types';
import { CMTokensAdapter, TokenEnrollmentData } from './adapter_types';

export class ElasticsearchTokensAdapter implements CMTokensAdapter {
  private database: DatabaseAdapter;
  private framework: BackendFrameworkAdapter;

  constructor(database: DatabaseAdapter, framework: BackendFrameworkAdapter) {
    this.database = database;
    this.framework = framework;
  }

  public async deleteEnrollmentToken(enrollmentToken: string) {
    const params = {
      id: `enrollment_token:${enrollmentToken}`,
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    await this.database.delete(this.framework.internalUser, params);
  }

  public async getEnrollmentToken(tokenString: string): Promise<TokenEnrollmentData> {
    const params = {
      id: `enrollment_token:${tokenString}`,
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    const response = await this.database.get(this.framework.internalUser, params);
    const tokenDetails = get<TokenEnrollmentData>(response, '_source.enrollment_token', {
      expires_on: '0',
      token: null,
    });

    // Elasticsearch might return fast if the token is not found. OR it might return fast
    // if the token *is* found. Either way, an attacker could using a timing attack to figure
    // out whether a token is valid or not. So we introduce a random delay in returning from
    // this function to obscure the actual time it took for Elasticsearch to find the token.
    const randomDelayInMs = 25 + Math.round(Math.random() * 200); // between 25 and 225 ms
    return new Promise<TokenEnrollmentData>(resolve =>
      setTimeout(() => resolve(tokenDetails), randomDelayInMs)
    );
  }

  public async upsertTokens(user: FrameworkUser, tokens: TokenEnrollmentData[]) {
    const body = flatten(
      tokens.map(token => [
        { index: { _id: `enrollment_token:${token.token}` } },
        {
          enrollment_token: token,
          type: 'enrollment_token',
        },
      ])
    );

    await this.database.bulk(user, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
    return tokens;
  }
}
