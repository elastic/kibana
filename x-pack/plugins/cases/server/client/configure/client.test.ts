/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { CasesClientArgs } from '../types';
import { getConnectors } from './client';

describe('client', () => {
  describe('getConnectors', () => {
    const logger = loggingSystemMock.createLogger();
    const actionsClient = actionsClientMock.create();

    const args = { actionsClient, logger } as unknown as CasesClientArgs;

    const actionTypes = [
      {
        id: '.jira',
        name: '1',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
      },
      {
        id: '.servicenow',
        name: '2',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
      },
      {
        id: '.unsupported',
        name: '3',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
      },
      {
        id: '.swimlane',
        name: 'swimlane',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
        minimumLicenseRequired: 'basic' as const,
      },
    ];

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
      {
        id: '3',
        actionTypeId: '.unsupported',
        name: '3',
        config: {},
        isPreconfigured: false,
        referencedByCount: 1,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('remove unsupported connectors', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => connectors);

      expect(await getConnectors(args)).toEqual([
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
      ]);
    });

    it('returns preconfigured connectors', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => [
        ...connectors,
        {
          id: '4',
          actionTypeId: '.servicenow',
          name: 'sn-preconfigured',
          config: {},
          isPreconfigured: true,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([
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
        {
          id: '4',
          actionTypeId: '.servicenow',
          name: 'sn-preconfigured',
          config: {},
          isPreconfigured: true,
          referencedByCount: 1,
        },
      ]);
    });

    it('filter out connectors that are unsupported by the current license', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => [
        ...connectors,
        {
          id: '4',
          actionTypeId: '.swimlane',
          name: 'swimlane',
          config: {},
          isPreconfigured: false,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([
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
      ]);
    });
  });
});
