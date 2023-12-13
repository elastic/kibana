/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import { ConstructorOptions, RuleTypeRegistry } from '../rule_type_registry';
import { TaskRunnerFactory } from '../task_runner/task_runner_factory';
import { ILicenseState } from './license_state';
import { licenseStateMock } from './license_state.mock';
import { schema } from '@kbn/config-schema';
import { createGetAlertIndicesAliasFn } from './create_get_alert_indices_alias';
import { AlertingConfig } from '../config';

describe('createGetAlertIndicesAliasFn', () => {
  const logger = loggingSystemMock.create().get();
  const mockedLicenseState: jest.Mocked<ILicenseState> = licenseStateMock.create();
  const taskManager = taskManagerMock.createSetup();
  const inMemoryMetrics = inMemoryMetricsMock.create();

  const ruleTypeRegistryParams: ConstructorOptions = {
    config: {} as AlertingConfig,
    logger,
    taskManager,
    taskRunnerFactory: new TaskRunnerFactory(),
    alertsService: null,
    licenseState: mockedLicenseState,
    licensing: licensingMock.createSetup(),
    minimumScheduleInterval: { value: '1m', enforce: false },
    inMemoryMetrics,
    latestRuleVersion: 1,
  };
  const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
  registry.register({
    id: 'test',
    name: 'Test',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: jest.fn(),
    category: 'test',
    producer: 'alerts',
    alerts: {
      context: 'test',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    },
    validate: {
      params: { validate: (params) => params },
    },
  });
  registry.register({
    id: 'spaceAware',
    name: 'Space Aware',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: jest.fn(),
    category: 'test',
    producer: 'alerts',
    alerts: {
      context: 'spaceAware',
      isSpaceAware: true,
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    },
    validate: {
      params: { validate: (params) => params },
    },
  });
  registry.register({
    id: 'foo',
    name: 'Foo',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: jest.fn(),
    category: 'test',
    producer: 'alerts',
    validate: {
      params: schema.any(),
    },
  });
  const getAlertIndicesAlias = createGetAlertIndicesAliasFn(registry);

  test('getAlertIndicesAlias for the rule type with alert context', () => {
    expect(getAlertIndicesAlias(['test'])).toEqual(['.alerts-test.alerts-default']);
  });
  test('getAlertIndicesAlias for the rule type with alert context with space I', () => {
    expect(getAlertIndicesAlias(['spaceAware'], 'space-1')).toEqual([
      '.alerts-spaceAware.alerts-space-1',
    ]);
  });
  test('getAlertIndicesAlias for the rule type with NO alert context', () => {
    expect(getAlertIndicesAlias(['foo'])).toEqual([]);
  });
});
