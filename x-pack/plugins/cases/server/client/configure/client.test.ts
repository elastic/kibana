/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from '../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getConnectors } from './client';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { ActionType } from '@kbn/actions-plugin/common/types';

describe('client', () => {
  describe('getConnectors', () => {
    const logger = loggingSystemMock.createLogger();
    const actionsClient = actionsClientMock.create();

    const args = { actionsClient, logger } as unknown as CasesClientArgs;

    const jiraType: ActionType = {
      id: '.jira',
      name: '1',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('removes connectors without a config field defined', async () => {
      actionsClient.listTypes.mockImplementation(async () => [jiraType]);

      actionsClient.getAll.mockImplementation(async () => [
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          isPreconfigured: false,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([]);
    });

    it('removes connectors that are pre configured', async () => {
      actionsClient.listTypes.mockImplementation(async () => [jiraType]);

      actionsClient.getAll.mockImplementation(async () => [
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          config: {},
          isPreconfigured: true,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([]);
    });

    it('includes connectors that have a config and are not pre configured', async () => {
      actionsClient.listTypes.mockImplementation(async () => [
        jiraType,
        {
          id: '.servicenow',
          name: '2',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ]);

      const connectors = [
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          config: {},
          isPreconfigured: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          referencedByCount: 1,
        },
      ];

      actionsClient.getAll.mockImplementation(async () => connectors);

      expect(await getConnectors(args)).toEqual(connectors);
    });
  });
});
