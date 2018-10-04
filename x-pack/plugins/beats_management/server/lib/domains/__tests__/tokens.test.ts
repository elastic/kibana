/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HapiBackendFrameworkAdapter } from '../../adapters/framework/hapi_framework_adapter';
import { TokenEnrollmentData } from '../../adapters/tokens/adapter_types';
import { MemoryTokensAdapter } from '../../adapters/tokens/memory_tokens_adapter';
import { CMTokensDomain } from '../tokens';

import Chance from 'chance';
import moment from 'moment';
import { BackendFrameworkAdapter } from '../../adapters/framework/adapter_types';

const seed = Date.now();
const chance = new Chance(seed);

const settings = {
  encryptionKey: 'something_who_cares',
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};

describe('Token Domain Lib', () => {
  let tokensLib: CMTokensDomain;
  let tokensDB: TokenEnrollmentData[] = [];
  let framework: BackendFrameworkAdapter;

  beforeEach(async () => {
    tokensDB = [];
    framework = new HapiBackendFrameworkAdapter(settings);

    tokensLib = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), {
      framework,
    });
  });

  it('should generate webtokens with a qty of 1', async () => {
    const tokens = await tokensLib.createEnrollmentTokens(framework.internalUser, 1);

    expect(tokens.length).toBe(1);

    expect(typeof tokens[0]).toBe('string');
  });

  it('should create the specified number of tokens', async () => {
    const numTokens = chance.integer({ min: 1, max: 20 });
    const tokensFromApi = await tokensLib.createEnrollmentTokens(framework.internalUser, numTokens);

    expect(tokensFromApi.length).toEqual(numTokens);
    expect(tokensFromApi).toEqual(tokensDB.map((t: TokenEnrollmentData) => t.token));
  });

  it('should set token expiration to 10 minutes from now by default', async () => {
    await tokensLib.createEnrollmentTokens(framework.internalUser, 1);

    const token = tokensDB[0];

    // We do a fuzzy check to see if the token expires between 9 and 10 minutes
    // from now because a bit of time has elapsed been the creation of the
    // tokens and this check.
    const tokenExpiresOn = moment(token.expires_on).valueOf();

    // Because sometimes the test runs so fast it it equal, and we dont use expect.js version that has toBeLessThanOrEqualTo
    const tenMinutesFromNow = moment()
      .add('10', 'minutes')
      .add('1', 'seconds')
      .valueOf();

    const almostTenMinutesFromNow = moment(tenMinutesFromNow)
      .subtract('2', 'seconds')
      .valueOf();
    expect(tokenExpiresOn).toBeLessThan(tenMinutesFromNow);
    expect(tokenExpiresOn).toBeGreaterThan(almostTenMinutesFromNow);
  });
});
