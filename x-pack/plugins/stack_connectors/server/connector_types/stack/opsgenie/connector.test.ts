/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { OpsgenieId } from '.';
import { OpsgenieConnector } from './connector';

describe('OpsgenieConnector', () => {
  let connector: OpsgenieConnector;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();

    connector = new OpsgenieConnector({
      configurationUtilities: mockedActionsConfig,
      config: { apiUrl: 'https://example.com' },
      connector: { id: '1', type: OpsgenieId },
      secrets: { apiKey: '123' },
      logger,
      services,
    });
  });

  it('calls request with the correct arguments for creating an alert', async () => {
    const connectorSpy = jest
      // @ts-expect-error it's complaining because request is a protected method
      .spyOn(connector, 'request')
      .mockImplementation(async () => ({}));
    await connector.createAlert({ message: 'hello' });

    expect(connectorSpy).toBeCalledWith({
      method: 'post',
      url: 'https://example.com',
      data: { message: 'hello' },
      headers: { Authorization: 'GenieKey 123' },
      responseSchema: expect.anything(),
    });
  });

  it('calls request with the correct arguments for closing an alert', async () => {
    const connectorSpy = jest
      // @ts-expect-error it's complaining because request is a protected method
      .spyOn(connector, 'request')
      .mockImplementation(async () => ({}));
    await connector.closeAlert({ user: 'sam' });

    expect(connectorSpy).toBeCalledWith({
      method: 'post',
      url: 'https://example.com/close',
      data: { user: 'sam' },
      headers: { Authorization: 'GenieKey 123' },
      responseSchema: expect.anything(),
    });
  });
});
