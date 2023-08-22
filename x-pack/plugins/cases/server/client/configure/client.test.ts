/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { CasesClientArgs } from '../types';
import { getConnectors, get, update } from './client';
import { createCasesClientInternalMock, createCasesClientMockArgs } from '../mocks';
import { MAX_SUPPORTED_CONNECTORS_RETURNED } from '../../../common/constants';

describe('client', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClientInternal = createCasesClientInternalMock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
      {
        id: '.servicenow',
        name: '2',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
      {
        id: '.unsupported',
        name: '3',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
      },
      {
        id: '.swimlane',
        name: 'swimlane',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
    ];

    const connectors = [
      {
        id: '1',
        actionTypeId: '.jira',
        name: '1',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 1,
      },
      {
        id: '2',
        actionTypeId: '.servicenow',
        name: '2',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,

        referencedByCount: 1,
      },
      {
        id: '3',
        actionTypeId: '.unsupported',
        name: '3',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
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
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
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
          isDeprecated: false,
          isSystemAction: false,
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
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '4',
          actionTypeId: '.servicenow',
          name: 'sn-preconfigured',
          config: {},
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
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
          isDeprecated: false,
          isSystemAction: false,
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
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
      ]);
    });

    it('limits connectors returned to 1000', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes.slice(0, 1));
      actionsClient.getAll.mockImplementation(async () =>
        Array(MAX_SUPPORTED_CONNECTORS_RETURNED + 1).fill(connectors[0])
      );

      expect((await getConnectors(args)).length).toEqual(MAX_SUPPORTED_CONNECTORS_RETURNED);
    });
  });

  describe('get', () => {
    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        get({ owner: 'cases', foo: 'bar' }, clientArgs, casesClientInternal)
      ).rejects.toThrow('invalid keys "foo"');
    });
  });

  describe('update', () => {
    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        update('test-id', { version: 'test-version', foo: 'bar' }, clientArgs, casesClientInternal)
      ).rejects.toThrow('invalid keys "foo"');
    });
  });
});
