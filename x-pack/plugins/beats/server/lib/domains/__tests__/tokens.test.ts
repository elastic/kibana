/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { verify as verifyToken } from 'jsonwebtoken';
import { wrapRequest } from '../../../utils/wrap_request';
import { TestingBackendFrameworkAdapter } from '../../adapters/famework/kibana/testing_framework_adapter';
import { MemoryTokensAdapter } from '../../adapters/tokens/memory_tokens_adapter';
import { CMTokensDomain } from '../tokens';

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

  beforeEach(async () => {
    const framework = new TestingBackendFrameworkAdapter(null, settings);

    tokensLib = new CMTokensDomain(new MemoryTokensAdapter(), {
      framework,
    });
  });

  it('should generate webtokens with a qty of 1', async () => {
    const tokens = await tokensLib.createEnrollmentTokens(fakeReq, 1);

    expect(tokens.length).to.be(1);

    expect(typeof tokens[0]).to.be('string');

    expect(() => {
      verifyToken(tokens[0], settings.encryptionKey);
    }).to.not.throwException();

    expect(() => {
      verifyToken(tokens[0], 'this_should_error');
    }).to.throwException();
  });
});
