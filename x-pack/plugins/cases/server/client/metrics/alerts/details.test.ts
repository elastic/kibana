/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientMock, createCasesClientMock } from '../../mocks';
import { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '../../../../../../../src/core/server/mocks';

import { AlertDetails } from './details';
import { mockAlertsService } from '../test_utils/alerts';
import { BaseHandlerCommonOptions } from '../types';

describe('AlertDetails', () => {
  let client: CasesClientMock;
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];
  let constructorOptions: BaseHandlerCommonOptions;

  beforeEach(() => {
    client = createMockClient();
    ({ mockServices, clientArgs } = createMockClientArgs());
    constructorOptions = { caseId: '', casesClient: client, clientArgs };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty alert details metrics when there are no alerts', async () => {
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [];
    });

    const handler = new AlertDetails({
      caseId: '',
      casesClient: client,
      clientArgs: {} as CasesClientArgs,
    });
    expect(await handler.compute()).toEqual({});
  });

  it('returns the default zero values when there are no alerts but features are requested', async () => {
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [];
    });

    const handler = new AlertDetails({
      caseId: '',
      casesClient: client,
      clientArgs: {} as CasesClientArgs,
    });
    handler.setupFeature('alerts.hosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for hosts when the count aggregation returns undefined', async () => {
    mockServices.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature('alerts.hosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for users when the count aggregation returns undefined', async () => {
    mockServices.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature('alerts.users');

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for hosts when the top hits aggregation returns undefined', async () => {
    mockServices.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature('alerts.hosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for users when the top hits aggregation returns undefined', async () => {
    mockServices.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature('alerts.users');

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns empty alert details metrics when no features were setup', async () => {
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails({
      caseId: '',
      casesClient: client,
      clientArgs: {} as CasesClientArgs,
    });
    expect(await handler.compute()).toEqual({});
  });

  it('returns empty alert details metrics when no features were setup when called twice', async () => {
    client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails({
      caseId: '',
      casesClient: client,
      clientArgs: {} as CasesClientArgs,
    });
    expect(await handler.compute()).toEqual({});
    expect(await handler.compute()).toEqual({});
  });

  it('returns host details when the host feature is setup', async () => {
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature('alerts.hosts');

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: '1', name: 'host1', count: 1 }],
        },
      },
    });
  });

  it('returns user details when the user feature is setup', async () => {
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature('alerts.users');

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
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature('alerts.users');
    handler.setupFeature('alerts.hosts');

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
  };

  return { mockServices: clientArgs, clientArgs: clientArgs as unknown as CasesClientArgs };
}
