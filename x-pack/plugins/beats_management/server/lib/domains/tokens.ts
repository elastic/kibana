/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timingSafeEqual } from 'crypto';
import { sign as signToken, verify as verifyToken } from 'jsonwebtoken';
import moment from 'moment';
import uuid from 'uuid';
import { BackendFrameworkAdapter } from '../adapters/framework/adapter_types';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { CMTokensAdapter } from '../adapters/tokens/adapter_types';

const RANDOM_TOKEN_1 = 'b48c4bda384a40cb91c6eb9b8849e77f';
const RANDOM_TOKEN_2 = '80a3819e3cd64f4399f1d4886be7a08b';

export class CMTokensDomain {
  private adapter: CMTokensAdapter;
  private framework: BackendFrameworkAdapter;

  constructor(adapter: CMTokensAdapter, libs: { framework: BackendFrameworkAdapter }) {
    this.adapter = adapter;
    this.framework = libs.framework;
  }

  public async getEnrollmentToken(enrollmentToken: string) {
    const fullToken = await this.adapter.getEnrollmentToken(enrollmentToken);

    if (!fullToken) {
      return {
        token: null,
        expired: true,
        expires_on: null,
      };
    }

    const { verified, expired } = this.verifyToken(enrollmentToken, fullToken.token || '', false);

    if (!verified) {
      return {
        expired,
        token: null,
        expires_on: null,
      };
    }

    return { ...fullToken, expired };
  }

  public async deleteEnrollmentToken(enrollmentToken: string) {
    return await this.adapter.deleteEnrollmentToken(enrollmentToken);
  }

  public verifyToken(recivedToken: string, token2: string, decode = true) {
    let tokenDecoded = true;
    let expired = false;

    if (decode) {
      const enrollmentTokenSecret = this.framework.getSetting('xpack.beats.encryptionKey');

      try {
        verifyToken(recivedToken, enrollmentTokenSecret);
        tokenDecoded = true;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          expired = true;
        }
        tokenDecoded = false;
      }
    }

    if (
      typeof recivedToken !== 'string' ||
      typeof token2 !== 'string' ||
      recivedToken.length !== token2.length
    ) {
      // This prevents a more subtle timing attack where we know already the tokens aren't going to
      // match but still we don't return fast. Instead we compare two pre-generated random tokens using
      // the same comparison algorithm that we would use to compare two equal-length tokens.
      return {
        expired,
        verified:
          timingSafeEqual(
            Buffer.from(RANDOM_TOKEN_1, 'utf8'),
            Buffer.from(RANDOM_TOKEN_2, 'utf8')
          ) && tokenDecoded,
      };
    }

    return {
      expired,
      verified:
        timingSafeEqual(Buffer.from(recivedToken, 'utf8'), Buffer.from(token2, 'utf8')) &&
        tokenDecoded,
    };
  }

  public generateAccessToken() {
    const enrollmentTokenSecret = this.framework.getSetting('xpack.beats.encryptionKey');

    const tokenData = {
      created: moment().toJSON(),
      randomHash: this.createRandomHash(),
    };

    return signToken(tokenData, enrollmentTokenSecret);
  }

  public async createEnrollmentTokens(
    user: FrameworkUser,
    numTokens: number = 1
  ): Promise<string[]> {
    const tokens = [];
    const enrollmentTokensTtlInSeconds = this.framework.getSetting(
      'xpack.beats.enrollmentTokensTtlInSeconds'
    );

    const enrollmentTokenExpiration = moment()
      .add(enrollmentTokensTtlInSeconds, 'seconds')
      .toJSON();

    while (tokens.length < numTokens) {
      tokens.push({
        expires_on: enrollmentTokenExpiration,
        token: this.createRandomHash(),
      });
    }

    await this.adapter.upsertTokens(user, tokens);

    return tokens.map(token => token.token);
  }

  private createRandomHash() {
    return uuid.v4().replace(/-/g, '');
  }
}
