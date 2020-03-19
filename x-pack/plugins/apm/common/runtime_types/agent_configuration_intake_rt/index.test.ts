/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { agentConfigurationIntakeRt } from './index';
import { isRight } from 'fp-ts/lib/Either';

describe('agentConfigurationIntakeRt', () => {
  it('is valid when required parameters are given', () => {
    const config = {
      service: {},
      settings: {}
    };

    expect(isConfigValid(config)).toBe(true);
  });

  it('is valid when required and optional parameters are given', () => {
    const config = {
      service: { name: 'my-service', environment: 'my-environment' },
      settings: {
        transaction_sample_rate: 0.5,
        capture_body: 'foo',
        transaction_max_spans: 10
      }
    };

    expect(isConfigValid(config)).toBe(true);
  });

  it('is invalid when required parameters are not given', () => {
    const config = {};
    expect(isConfigValid(config)).toBe(false);
  });
});

function isConfigValid(config: any) {
  return isRight(agentConfigurationIntakeRt.decode(config));
}
