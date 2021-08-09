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

import type { RuleDataClient } from '../../../../../../rule_registry/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../../alerting/server';
import { ConfigType } from '../../../../config';
import { AlertAttributes } from '../../signals/types';
import { createRuleMock } from './rule';
import { listMock } from '../../../../../../lists/server/mocks';
import { ruleRegistryMocks } from '../../../../../../rule_registry/server/mocks';

export const createRuleTypeMocks = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({} as ConfigType);

  const loggerMock = ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown) as Logger;

  const alerting = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as AlertingPluginSetupContract;

  const scheduleActions = jest.fn();

  const mockSavedObjectsClient = savedObjectsClientMock.create();
  mockSavedObjectsClient.get.mockResolvedValue({
    id: 'de2f6a49-28a3-4794-bad7-0e9482e075f8',
    type: 'query',
    references: [],
    attributes: {
      actions: [],
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
      params: createRuleMock(),
    },
  } as SavedObject<AlertAttributes>);

  const services = {
    savedObjectsClient: mockSavedObjectsClient,
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    findAlerts: jest.fn(), // TODO: does this stay?
    alertWithPersistence: jest.fn(),
    logger: loggerMock,
  };

  return {
    dependencies: {
      alerting,
      buildRuleMessage: jest.fn(),
      config$: mockedConfig$,
      lists: listMock.createSetup(),
      logger: loggerMock,
      ruleDataClient: ({
        getReader: jest.fn(() => ({
          search: jest.fn(),
        })),
        getWriter: jest.fn(() => ({
          bulk: jest.fn(),
        })),
        isWriteEnabled: jest.fn(() => true),
      } as unknown) as RuleDataClient,
      ruleDataService: ruleRegistryMocks.createRuleDataPluginService(),
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, unknown> }) => {
      return alertExecutor({
        services,
        params,
        alertId: v4(),
        startedAt: new Date(),
      });
    },
  };
};
