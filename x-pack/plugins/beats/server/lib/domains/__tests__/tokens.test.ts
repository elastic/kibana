/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { wrapRequest } from '../../../utils/wrap_request';
import { TestingBackendFrameworkAdapter } from '../../adapters/famework/kibana/testing_framework_adapter';
import { MemoryTokensAdapter } from '../../adapters/tokens/memory_tokens_adapter';
import { EnrollmentToken } from '../../lib';
import { CMTokensDomain } from '../tokens';

import Chance from 'chance';
import moment from 'moment';

const seed = Date.now();
const chance = new Chance(seed);

const fakeReq = wrapRequest({
  headers: {},
  info: {},
  params: {},
  payload: {},
  query: {},
});

const settings = {
  encryptionKey: 'something_who_cares',
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};

describe('Token Domain Lib', () => {
  let tokensLib: CMTokensDomain;
  let tokensDB: EnrollmentToken[] = [];

  beforeEach(async () => {
    tokensDB = [];
    const framework = new TestingBackendFrameworkAdapter(null, settings);

    tokensLib = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), {
      framework,
    });
  });

  it('should generate webtokens with a qty of 1', async () => {
    const tokens = await tokensLib.createEnrollmentTokens(fakeReq, 1);

    expect(tokens.length).to.be(1);

    expect(typeof tokens[0]).to.be('string');
  });

  it('should create the specified number of tokens', async () => {
    const numTokens = chance.integer({ min: 1, max: 20 });
    const tokensFromApi = await tokensLib.createEnrollmentTokens(
      fakeReq,
      numTokens
    );

    expect(tokensFromApi.length).to.eql(numTokens);
    expect(tokensFromApi).to.eql(tokensDB.map((t: EnrollmentToken) => t.token));
  });

  it('should set token expiration to 10 minutes from now by default', async () => {
    await tokensLib.createEnrollmentTokens(fakeReq, 1);

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
    expect(tokenExpiresOn).to.be.lessThan(tenMinutesFromNow);
    expect(tokenExpiresOn).to.be.greaterThan(almostTenMinutesFromNow);
  });
});
