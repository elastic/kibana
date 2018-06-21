/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import uuid from 'uuid';
import { CMTokensAdapter, FrameworkRequest } from '../lib';
import { BackendFrameworkAdapter } from '../lib';

export class CMTokensDomain {
  private adapter: CMTokensAdapter;
  private kibana: BackendFrameworkAdapter;

  constructor(
    adapter: CMTokensAdapter,
    libs: { kibana: BackendFrameworkAdapter }
  ) {
    this.adapter = adapter;
    this.kibana = libs.kibana;
  }

  public async getEnrollmentToken(enrollmentToken: string) {
    return await this.adapter.getEnrollmentToken(enrollmentToken);
  }

  public async deleteEnrollmentToken(enrollmentToken: string) {
    return await this.adapter.deleteEnrollmentToken(enrollmentToken);
  }

  public async createEnrollmentTokens(
    req: FrameworkRequest,
    numTokens: number = 1
  ): Promise<string[]> {
    const tokens = [];
    const enrollmentTokensTtlInSeconds = this.kibana.getSetting(
      'xpack.beats.enrollmentTokensTtlInSeconds'
    );
    const enrollmentTokenExpiration = moment()
      .add(enrollmentTokensTtlInSeconds, 'seconds')
      .toJSON();

    while (tokens.length < numTokens) {
      tokens.push({
        expires_on: enrollmentTokenExpiration,
        token: uuid.v4().replace(/-/g, ''),
      });
    }

    await this.adapter.upsertTokens(req, tokens);

    return tokens.map(token => token.token);
  }
}
