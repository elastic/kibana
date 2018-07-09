/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../famework/adapter_types';
import { CMTokensAdapter, EnrollmentToken } from './adapter_types';

export class MemoryTokensAdapter implements CMTokensAdapter {
  private tokenDB: EnrollmentToken[];

  constructor(tokenDB: EnrollmentToken[]) {
    this.tokenDB = tokenDB;
  }

  public async deleteEnrollmentToken(enrollmentToken: string) {
    const index = this.tokenDB.findIndex(
      token => token.token === enrollmentToken
    );

    if (index > -1) {
      this.tokenDB.splice(index, 1);
    }
  }

  public async getEnrollmentToken(
    tokenString: string
  ): Promise<EnrollmentToken> {
    return new Promise<EnrollmentToken>(resolve => {
      return resolve(this.tokenDB.find(token => token.token === tokenString));
    });
  }

  public async upsertTokens(req: FrameworkRequest, tokens: EnrollmentToken[]) {
    tokens.forEach(token => {
      const existingIndex = this.tokenDB.findIndex(
        t => t.token === token.token
      );
      if (existingIndex !== -1) {
        this.tokenDB[existingIndex] = token;
      } else {
        this.tokenDB.push(token);
      }
    });
    return tokens;
  }
}
