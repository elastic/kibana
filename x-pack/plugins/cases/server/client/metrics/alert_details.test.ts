/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../mocks';
import { CasesClientArgs } from '../types';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { createAlertServiceMock } from '../../services/mocks';

import { AlertDetails } from './alert_details';
import { AggregationFields } from '../../services/alerts/types';

describe('AlertDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty alert details metrics when there are no alerts', async () => {
    const client = createCasesClientMock();
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [];
    });

    const handler = new AlertDetails('', client, {} as CasesClientArgs);
    expect(await handler.compute()).toEqual({});
  });

  it('returns empty alert details metrics when no features were setup', async () => {
    const client = createCasesClientMock();
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails('', client, {} as CasesClientArgs);
    expect(await handler.compute()).toEqual({});
  });

  it('returns empty alert details metrics when no features were setup when called twice', async () => {
    const client = createCasesClientMock();
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails('', client, {} as CasesClientArgs);
    expect(await handler.compute()).toEqual({});
    expect(await handler.compute()).toEqual({});
  });

  it('returns host details when the host feature is setup', async () => {
    const client = createMockClient();
    const clientArgs = createMockClientArgs();
    const handler = new AlertDetails('', client, clientArgs);

    handler.setupFeature('alertHosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: '1', name: 'host1', count: 1 }],
        },
      },
    });
  });

  it('only performs a single query to retrieve the details when compute is called twice', async () => {
    expect.assertions(2);

    const client = createMockClient();
    const alertsService = mockAlertsService();

    const clientArgs = {
      alertsService,
    } as unknown as CasesClientArgs;

    const handler = new AlertDetails('', client, clientArgs);

    handler.setupFeature('alertHosts');

    await handler.compute();
    await handler.compute();
    expect(alertsService.getMostFrequentValuesForFields).toHaveBeenCalledTimes(1);
    expect(alertsService.countUniqueValuesForFields).toHaveBeenCalledTimes(1);
  });

  it('returns user details when the user feature is setup', async () => {
    const client = createMockClient();
    const clientArgs = createMockClientArgs();
    const handler = new AlertDetails('', client, clientArgs);

    handler.setupFeature('alertUsers');

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 2,
          values: [{ name: 'user1', count: 1 }],
        },
      },
    });
  });

  it('returns user and host details when the user and host features are setup', async () => {
    const client = createMockClient();
    const clientArgs = createMockClientArgs();
    const handler = new AlertDetails('', client, clientArgs);

    handler.setupFeature('alertUsers');
    handler.setupFeature('alertHosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: '1', name: 'host1', count: 1 }],
        },
        users: {
          total: 2,
          values: [{ name: 'user1', count: 1 }],
        },
      },
    });
  });
});

function createMockClient() {
  const client = createCasesClientMock();
  client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
    return [{ id: '1', index: '2', attached_at: '3' }];
  });

  return client;
}

function createMockClientArgs() {
  const alertsService = mockAlertsService();

  const logger = loggingSystemMock.createLogger();

  const clientArgs = {
    logger,
    alertsService,
  } as unknown as CasesClientArgs;

  return clientArgs;
}

function mockAlertsService() {
  const alertsService = createAlertServiceMock();
  alertsService.getMostFrequentValuesForFields.mockImplementation(
    async ({ fields }: { fields: AggregationFields[] }) => {
      let result = {};
      for (const field of fields) {
        switch (field) {
          case AggregationFields.Hosts:
            result = { ...result, hosts: [{ name: 'host1', id: '1', count: 1 }] };
            break;
          case AggregationFields.Users:
            result = { ...result, users: [{ name: 'user1', count: 1 }] };
            break;
        }
      }
      return result;
    }
  );

  alertsService.countUniqueValuesForFields.mockImplementation(
    async ({ fields }: { fields: AggregationFields[] }) => {
      let result = {};
      for (const field of fields) {
        switch (field) {
          case AggregationFields.Hosts:
            result = { ...result, totalHosts: 2 };
            break;
          case AggregationFields.Users:
            result = { ...result, totalUsers: 2 };
            break;
        }
      }
      return result;
    }
  );

  return alertsService;
}
