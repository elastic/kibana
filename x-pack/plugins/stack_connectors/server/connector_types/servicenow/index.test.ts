/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '../../mocks';
import { createActionTypeRegistry } from '../index.test';
import {
  ServiceNowPublicConfigurationBaseType,
  ServiceNowSecretConfigurationType,
  ExecutorParams,
  PushToServiceResponse,
} from './types';
import {
  ServiceNowActionType,
  ServiceNowITSMActionTypeId,
  ServiceNowSIRActionTypeId,
  ServiceNowActionTypeExecutorOptions,
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

  describe('ServiceNow ITSM', () => {
    let actionType: ServiceNowActionType;

    beforeAll(() => {
      const { actionTypeRegistry } = createActionTypeRegistry();
      actionType = actionTypeRegistry.get<
        ServiceNowPublicConfigurationBaseType,
        ServiceNowSecretConfigurationType,
        ExecutorParams,
        PushToServiceResponse | {}
      >(ServiceNowITSMActionTypeId);
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
        } as unknown as ServiceNowActionTypeExecutorOptions;
        await actionType.executor(executorOptions);
        expect((api.pushToService as jest.Mock).mock.calls[0][0].commentFieldKey).toBe(
          'work_notes'
        );
      });
    });
  });

  describe('ServiceNow SIR', () => {
    let actionType: ServiceNowActionType;

    beforeAll(() => {
      const { actionTypeRegistry } = createActionTypeRegistry();
      actionType = actionTypeRegistry.get<
        ServiceNowPublicConfigurationBaseType,
        ServiceNowSecretConfigurationType,
        ExecutorParams,
        PushToServiceResponse | {}
      >(ServiceNowSIRActionTypeId);
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
        } as unknown as ServiceNowActionTypeExecutorOptions;
        await actionType.executor(executorOptions);
        expect((api.pushToService as jest.Mock).mock.calls[0][0].commentFieldKey).toBe(
          'work_notes'
        );
      });
    });
  });
});
