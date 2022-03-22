/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExecutionConfigForRuleType } from './get_rules_config';
import { RulesConfig } from '../config';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';

const ruleTypeId = 'test-rule-type-id';
const config = {
  minimumScheduleInterval: {
    value: '2m',
    enforce: false,
  },
  execution: {
    timeout: '1m',
    actions: { max: 1000 },
  },
} as RulesConfig;

const configWithRuleType = {
  ...config,
  execution: {
    ...config.execution,
    ruleTypeOverrides: [
      {
        id: ruleTypeId,
        timeout: '10m',
      },
    ],
  },
};

describe('get rules config', () => {
  test('returns the rule type specific config and keeps the default values that are not overwritten', () => {
    expect(
      getExecutionConfigForRuleType({
        config: configWithRuleType,
        ruleTypeId,
        logger: loggingSystemMock.create().get(),
      })
    ).toEqual({
      execution: {
        timeout: '10m',
        actions: { max: 1000 },
      },
    });
  });

  test('applies the config params passed from the origin plugin', () => {
    expect(
      getExecutionConfigForRuleType({
        config,
        configFromOriginPlugin: { execution: { timeout: '23m' } },
        ruleTypeId,
        logger: loggingSystemMock.create().get(),
      })
    ).toEqual({
      execution: {
        timeout: '23m',
        actions: { max: 1000 },
      },
    });
  });

  test('applies the existing timeout value and logs an error if the timeout param passed from the origin plugin is invalid', () => {
    expect(
      getExecutionConfigForRuleType({
        config,
        configFromOriginPlugin: { execution: { timeout: 'invalid' } },
        ruleTypeId,
        logger: loggingSystemMock.create().get(),
      })
    ).toEqual({
      execution: {
        timeout: '1m',
        actions: { max: 1000 },
      },
    });
  });

  test("applies the default timeout value if the timeout param passed from the origin plugin is invalid and there isn't timeout from config", () => {
    expect(
      getExecutionConfigForRuleType({
        config: {
          ...config,
          execution: {
            actions: { max: 1000 },
          },
        },
        configFromOriginPlugin: { execution: { timeout: 'invalid' } },
        ruleTypeId,
        logger: loggingSystemMock.create().get(),
      })
    ).toEqual({
      execution: {
        timeout: '5m',
        actions: { max: 1000 },
      },
    });
  });

  test('returns the default config when there is neither rule type specific config not config from plugin', () => {
    expect(
      getExecutionConfigForRuleType({
        config,
        ruleTypeId,
        logger: loggingSystemMock.create().get(),
      })
    ).toEqual(config);
  });
});
