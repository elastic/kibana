/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { agentConfigurationIntakeRt } from './agent_configuration_intake_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('agentConfigurationIntakeRt', () => {
  it('is valid when "transaction_sample_rate" is string', () => {
    const config = {
      service: { name: 'my-service', environment: 'my-environment' },
      settings: {
        transaction_sample_rate: '0.5',
      },
    };

    expect(isConfigValid(config)).toBe(true);
  });

  it('is invalid when "transaction_sample_rate" is number', () => {
    const config = {
      service: {},
      settings: {
        transaction_sample_rate: 0.5,
      },
    };

    expect(isConfigValid(config)).toBe(false);
  });

  it('is valid when unknown setting is string', () => {
    const config = {
      service: { name: 'my-service', environment: 'my-environment' },
      settings: {
        my_unknown_setting: '0.5',
      },
    };

    expect(isConfigValid(config)).toBe(true);
  });

  it('is invalid when unknown setting is boolean', () => {
    const config = {
      service: { name: 'my-service', environment: 'my-environment' },
      settings: {
        my_unknown_setting: false,
      },
    };

    expect(isConfigValid(config)).toBe(false);
  });
});

function isConfigValid(config: any) {
  return isRight(agentConfigurationIntakeRt.decode(config));
}
