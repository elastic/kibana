/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { IEventLogClient } from '../../../../event_log/server';
import { actionsClientMock } from '../../../../actions/server/mocks';
import { ConstructorOptions } from '../alerts_client';
import { eventLogClientMock } from '../../../../event_log/server/mocks';
import { AlertTypeRegistry } from '../../alert_type_registry';

export const mockedDateString = '2019-02-12T21:01:22.479Z';

export function setGlobalDate() {
  const mockedDate = new Date(mockedDateString);
  const DateOriginal = Date;
  // A version of date that responds to `new Date(null|undefined)` and `Date.now()`
  // by returning a fixed date, otherwise should be same as Date.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  (global as any).Date = class Date {
    constructor(...args: unknown[]) {
      // sometimes the ctor has no args, sometimes has a single `null` arg
      if (args[0] == null) {
        // @ts-ignore
        return mockedDate;
      } else {
        // @ts-ignore
        return new DateOriginal(...args);
      }
    }
    static now() {
      return mockedDate.getTime();
    }
    static parse(string: string) {
      return DateOriginal.parse(string);
    }
  };
}

export function getBeforeSetup(
  alertsClientParams: jest.Mocked<ConstructorOptions>,
  taskManager: ReturnType<typeof taskManagerMock.createStart>,
  alertTypeRegistry: jest.Mocked<Pick<AlertTypeRegistry, 'get' | 'has' | 'register' | 'list'>>,
  eventLogClient?: jest.Mocked<IEventLogClient>
) {
  jest.resetAllMocks();
  alertsClientParams.createAPIKey.mockResolvedValue({ apiKeysEnabled: false });
  alertsClientParams.invalidateAPIKey.mockResolvedValue({
    apiKeysEnabled: true,
    result: {
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    },
  });
  alertsClientParams.getUserName.mockResolvedValue('elastic');
  taskManager.runNow.mockResolvedValue({ id: '' });
  const actionsClient = actionsClientMock.create();

  actionsClient.getBulk.mockResolvedValueOnce([
    {
      id: '1',
      isPreconfigured: false,
      actionTypeId: 'test',
      name: 'test',
      config: {
        foo: 'bar',
      },
    },
    {
      id: '2',
      isPreconfigured: false,
      actionTypeId: 'test2',
      name: 'test2',
      config: {
        foo: 'bar',
      },
    },
    {
      id: 'testPreconfigured',
      actionTypeId: '.slack',
      isPreconfigured: true,
      name: 'test',
    },
  ]);
  alertsClientParams.getActionsClient.mockResolvedValue(actionsClient);

  alertTypeRegistry.get.mockImplementation(() => ({
    id: '123',
    name: 'Test',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    async executor() {},
    producer: 'alerts',
  }));
  alertsClientParams.getEventLogClient.mockResolvedValue(
    eventLogClient ?? eventLogClientMock.create()
  );
}
