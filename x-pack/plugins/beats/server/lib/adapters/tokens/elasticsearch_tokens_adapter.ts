/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import {
  BackendFrameworkAdapter,
  CMTokensAdapter,
  EnrollmentToken,
  FrameworkRequest,
} from '../../lib';

export class ElasticsearchTokensAdapter implements CMTokensAdapter {
  private framework: BackendFrameworkAdapter;

  constructor(framework: BackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async deleteEnrollmentToken(enrollmentToken: string) {
    const params = {
      id: `enrollment_token:${enrollmentToken}`,
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    return this.framework.callWithInternalUser('delete', params);
  }

  public async getEnrollmentToken(
    tokenString: string
  ): Promise<EnrollmentToken> {
    const params = {
      id: `enrollment_token:${tokenString}`,
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    const response = await this.framework.callWithInternalUser('get', params);
    const tokenDetails = get<EnrollmentToken>(
      response,
      '_source.enrollment_token',
      {
        expires_on: '0',
        token: null,
      }
    );

    // Elasticsearch might return fast if the token is not found. OR it might return fast
    // if the token *is* found. Either way, an attacker could using a timing attack to figure
    // out whether a token is valid or not. So we introduce a random delay in returning from
    // this function to obscure the actual time it took for Elasticsearch to find the token.
    const randomDelayInMs = 25 + Math.round(Math.random() * 200); // between 25 and 225 ms
    return new Promise<EnrollmentToken>(resolve =>
      setTimeout(() => resolve(tokenDetails), randomDelayInMs)
    );
  }

  public async upsertTokens(req: FrameworkRequest, tokens: EnrollmentToken[]) {
    const body = flatten(
      tokens.map(token => [
        { index: { _id: `enrollment_token:${token.token}` } },
        {
          enrollment_token: token,
          type: 'enrollment_token',
        },
      ])
    );

    const params = {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    };

    await this.framework.callWithRequest(req, 'bulk', params);
  }
}
