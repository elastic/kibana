/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { Verifier } = require('@pact-foundation/pact');

describe('Pact Verification', () => {
  it('validates the expectations of E2E Tests', () => {
    const opts = {
      logLevel: 'INFO',
      providerBaseUrl: 'http://localhost:5601',
      provider: 'Kibana Fleet',
      providerVersion: '8.0.0-SNAPSHOT',
      pactUrls: [
        'https://raw.githubusercontent.com/elastic/e2e-testing/0aa330ea7c785ec43889d9fdde030c00711567ad/pacts/e2e_testing_framework-fleet.json',
      ],
    };

    return new Verifier(opts).verifyProvider().finally(() => {});
  });
});
