/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ExecutorParams, ServiceNowPublicConfigurationType } from '../lib/servicenow/types';
import {
  ServiceNowConnectorType,
  ServiceNowConnectorTypeExecutorOptions,
  getServiceNowSIRConnectorType,
} from '.';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    getChoices: jest.fn(),
    getFields: jest.fn(),
    getIncident: jest.fn(),
    handshake: jest.fn(),
    pushToService: jest.fn(),
  },
}));

const services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

describe('ServiceNow', () => {
  const config = { apiUrl: 'https://instance.com' };
  const secrets = { username: 'username', password: 'password' };
  const params = {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        short_description: 'An incident',
        description: 'This is serious',
      },
    },
  };

  beforeEach(() => {
    (api.pushToService as jest.Mock).mockResolvedValue({ id: 'some-id' });
  });

  describe('ServiceNow SIR', () => {
    let connectorType: ServiceNowConnectorType<ServiceNowPublicConfigurationType, ExecutorParams>;

    beforeAll(() => {
      connectorType = getServiceNowSIRConnectorType();
    });

    describe('execute()', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      test('it pass the correct comment field key', async () => {
        const actionId = 'some-action-id';
        const executorOptions = {
          actionId,
          config,
          secrets,
          params,
          services,
          logger: mockedLogger,
        } as unknown as ServiceNowConnectorTypeExecutorOptions<
          ServiceNowPublicConfigurationType,
          ExecutorParams
        >;
        await connectorType.executor(executorOptions);
        expect((api.pushToService as jest.Mock).mock.calls[0][0].commentFieldKey).toBe(
          'work_notes'
        );
      });
    });
  });
});
