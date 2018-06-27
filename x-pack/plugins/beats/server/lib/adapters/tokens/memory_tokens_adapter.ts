/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMTokensAdapter, EnrollmentToken, FrameworkRequest } from '../../lib';

const tokenDB: EnrollmentToken[] = [];

export class MemoryTokensAdapter implements CMTokensAdapter {
  public async deleteEnrollmentToken(enrollmentToken: string) {
    const index = tokenDB.findIndex(token => token.token === enrollmentToken);

    if (index > -1) {
      tokenDB.splice(index, 1);
    }
  }

  public async getEnrollmentToken(
    tokenString: string
  ): Promise<EnrollmentToken> {
    return new Promise<EnrollmentToken>(resolve => {
      return resolve(tokenDB.find(token => token.token === tokenString));
    });
  }

  public async upsertTokens(req: FrameworkRequest, tokens: EnrollmentToken[]) {
    tokens.forEach(token => {
      const existingIndex = tokenDB.findIndex(t => t.token === token.token);
      if (existingIndex !== -1) {
        tokenDB[existingIndex] = token;
      } else {
        tokenDB.push(token);
      }
    });
    return tokens;
  }
}
