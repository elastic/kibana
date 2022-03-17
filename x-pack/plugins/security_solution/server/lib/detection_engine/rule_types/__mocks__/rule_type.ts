/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { v4 } from 'uuid';

import { Logger, SavedObject } from 'kibana/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import { mlPluginServerMock } from '../../../../../../ml/server/mocks';

import type { IRuleDataClient } from '../../../../../../rule_registry/server';
import { ruleRegistryMocks } from '../../../../../../rule_registry/server/mocks';
import { eventLogServiceMock } from '../../../../../../event_log/server/mocks';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../../alerting/server';
import { ConfigType } from '../../../../config';
import { AlertAttributes } from '../../signals/types';
import { createRuleMock } from './rule';
import { listMock } from '../../../../../../lists/server/mocks';
import { QueryRuleParams, RuleParams } from '../../schemas/rule_schemas';
// this is only used in tests
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createDefaultAlertExecutorOptions } from '../../../../../../rule_registry/server/utils/rule_executor_test_utils';
import { getCompleteRuleMock } from '../../schemas/rule_schemas.mock';

export const createRuleTypeMocks = (
  ruleType: string = 'query',
  ruleParams: Partial<RuleParams> = {}
) => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({} as ConfigType);

  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const alerting = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as AlertingPluginSetupContract;

  const scheduleActions = jest.fn();

  const mockSavedObjectsClient = savedObjectsClientMock.create();
  mockSavedObjectsClient.get.mockResolvedValue({
    id: 'de2f6a49-28a3-4794-bad7-0e9482e075f8',
    type: ruleType,
    references: [],
    attributes: {
      actions: [],
      alertTypeId: 'siem.signals',
      enabled: true,
      name: 'mock rule',
      tags: [],
      createdBy: 'user1',
      createdAt: '',
      updatedBy: 'user2',
      schedule: {
        interval: '30m',
      },
      throttle: '',
      params: createRuleMock(ruleParams),
    },
  } as SavedObject<AlertAttributes>);

  const services = {
    savedObjectsClient: mockSavedObjectsClient,
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    alertFactory: {
      create: jest.fn(() => ({ scheduleActions })),
      done: jest.fn().mockResolvedValue({}),
    },
    findAlerts: jest.fn(), // TODO: does this stay?
    alertWithPersistence: jest.fn(),
    logger: loggerMock,
    shouldWriteAlerts: () => true,
  };

  return {
    dependencies: {
      alerting,
      buildRuleMessage: jest.fn(),
      config$: mockedConfig$,
      lists: listMock.createSetup(),
      logger: loggerMock,
      ml: mlPluginServerMock.createSetupContract(),
      ruleDataClient: {
        ...(ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts') as IRuleDataClient),
        getReader: jest.fn((_options?: { namespace?: string }) => ({
          search: jest.fn().mockResolvedValue({
            aggregations: undefined,
          }),
          getDynamicIndexPattern: jest.fn(),
        })),
      },
      eventLogService: eventLogServiceMock.create(),
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, unknown> }) => {
      return alertExecutor({
        ...createDefaultAlertExecutorOptions({
          params,
          alertId: v4(),
          state: {},
        }),
        runOpts: {
          completeRule: getCompleteRuleMock(params as QueryRuleParams),
        },
        services,
      });
    },
  };
};
