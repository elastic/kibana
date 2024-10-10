/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { ExecutorType, IRuleTypeAlerts } from '..';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { setupTestServers } from './lib';
import type { RuleTypeRegistry } from '../rule_type_registry';
import { RuleType } from '../types';

jest.mock('../rule_type_registry', () => {
  const actual = jest.requireActual('../rule_type_registry');
  return {
    ...actual,
    RuleTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.RuleTypeRegistry(opts);
    }),
  };
});

describe('Handle conflicts when writing alert docs', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let ruleTypeRegistry: RuleTypeRegistry;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedRuleTypeRegistry = jest.requireMock('../rule_type_registry');
    expect(mockedRuleTypeRegistry.RuleTypeRegistry).toHaveBeenCalledTimes(1);
    ruleTypeRegistry = mockedRuleTypeRegistry.RuleTypeRegistry.mock.results[0].value;

    console.log('Registering rule type');
    ruleTypeRegistry.register(getConflictingAlertsRuleType());
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  test('handle conflict when creating alert', async () => {
    console.log('running test');
    await wait(5000);
    console.log('finishing');
  });
});

function getExecutor(): ExecutorType<{}, {}, {}, {}, string, {}> {
  return async function () {
    return { state: {} };
  };
}

function getConflictingAlertsRuleType(): RuleType<{}, {}, {}, {}, {}, string, string, {}> {
  return {
    id: RULE_TYPE_ID,
    name: RULE_TYPE_ID,
    actionGroups: [{ id: ACTION_GROUP_ID, name: ACTION_GROUP_ID }],
    defaultActionGroupId: ACTION_GROUP_ID,
    validate: { params: { validate: () => ({}) } },
    actionVariables: {},
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: getExecutor(),
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
    alerts: STACK_ALERTS_AAD_CONFIG,
  };
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<{}> = {
  context: 'jest',
  mappings: {
    fieldMap: {},
  },
  shouldWrite: true,
  useEcs: true,
};

export const RULE_TYPE_ID = '...conflicting-alert-docs';
export const ACTION_GROUP_ID = 'default';
