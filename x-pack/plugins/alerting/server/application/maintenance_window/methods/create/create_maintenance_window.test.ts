/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { createMaintenanceWindow } from './create_maintenance_window';
import { CreateMaintenanceWindowParams } from './types';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import type { MaintenanceWindow } from '../../types';
import { FilterStateStore } from '@kbn/es-query';

const savedObjectsClient = savedObjectsClientMock.create();

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
};

describe('MaintenanceWindowClient - create', () => {
  beforeEach(() => {
    mockContext.getModificationMetadata.mockResolvedValueOnce(updatedMetadata);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should create maintenance window with the correct parameters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.create.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    const result = await createMaintenanceWindow(mockContext, {
      data: {
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
      },
    });

    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule,
        enabled: true,
        expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
        ...updatedMetadata,
      }),
      {
        id: expect.any(String),
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'test-id',
      })
    );
  });

  it('should create maintenance window with category ids', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.create.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    const result = await createMaintenanceWindow(mockContext, {
      data: {
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
        categoryIds: ['observability', 'securitySolution'],
      },
    });

    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule,
        enabled: true,
        expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
        categoryIds: ['observability', 'securitySolution'],
        ...updatedMetadata,
      }),
      {
        id: expect.any(String),
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'test-id',
      })
    );
  });

  it('should create maintenance window with scoped query', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    savedObjectsClient.create.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    await createMaintenanceWindow(mockContext, {
      data: {
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
        categoryIds: ['securitySolution'],
        scopedQuery: {
          kql: "_id: '1234'",
          filters: [
            {
              meta: {
                disabled: false,
                negate: false,
                alias: null,
                key: 'kibana.alert.action_group',
                field: 'kibana.alert.action_group',
                params: {
                  query: 'test',
                },
                type: 'phrase',
              },
              $state: {
                store: FilterStateStore.APP_STATE,
              },
              query: {
                match_phrase: {
                  'kibana.alert.action_group': 'test',
                },
              },
            },
          ],
        },
      },
    });

    expect(savedObjectsClient.create).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        title: mockMaintenanceWindow.title,
        duration: mockMaintenanceWindow.duration,
        rRule: mockMaintenanceWindow.rRule,
        enabled: true,
        expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
        categoryIds: ['securitySolution'],
        ...updatedMetadata,
      }),
      {
        id: expect.any(String),
      }
    );

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.kql
    ).toEqual(`_id: '1234'`);

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.filters[0]
    ).toEqual({
      $state: { store: 'appState' },
      meta: {
        alias: null,
        disabled: false,
        field: 'kibana.alert.action_group',
        key: 'kibana.alert.action_group',
        negate: false,
        params: { query: 'test' },
        type: 'phrase',
      },
      query: { match_phrase: { 'kibana.alert.action_group': 'test' } },
    });

    expect(
      (savedObjectsClient.create.mock.calls[0][1] as MaintenanceWindow).scopedQuery!.dsl
    ).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"_id\\":\\"'1234'\\"}}],\\"minimum_should_match\\":1}},{\\"match_phrase\\":{\\"kibana.alert.action_group\\":\\"test\\"}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  it('should throw if trying to create a maintenance window with invalid scoped query', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    await expect(async () => {
      await createMaintenanceWindow(mockContext, {
        data: {
          title: mockMaintenanceWindow.title,
          duration: mockMaintenanceWindow.duration,
          rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
          categoryIds: ['observability', 'securitySolution'],
          scopedQuery: {
            kql: 'invalid: ',
            filters: [],
          },
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Error validating create maintenance window data - invalid scoped query - Expected \\"(\\", \\"{\\", value, whitespace but end of input found.
      invalid: 
      ---------^"
    `);
  });

  it('should throw if trying to create a MW with a scoped query with other than 1 category ID', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    await expect(async () => {
      await createMaintenanceWindow(mockContext, {
        data: {
          title: mockMaintenanceWindow.title,
          duration: mockMaintenanceWindow.duration,
          rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
          categoryIds: ['observability', 'securitySolution'],
          scopedQuery: {
            kql: "_id: '1234'",
            filters: [
              {
                meta: {
                  disabled: false,
                  negate: false,
                  alias: null,
                  key: 'kibana.alert.action_group',
                  field: 'kibana.alert.action_group',
                  params: {
                    query: 'test',
                  },
                  type: 'phrase',
                },
                $state: {
                  store: FilterStateStore.APP_STATE,
                },
                query: {
                  match_phrase: {
                    'kibana.alert.action_group': 'test',
                  },
                },
              },
            ],
          },
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating create maintenance window data - scoped query must be accompanied by 1 category ID"`
    );
  });

  it('should throw if trying to create a maintenance window with invalid category ids', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const mockMaintenanceWindow = getMockMaintenanceWindow({
      expirationDate: moment(new Date()).tz('UTC').add(1, 'year').toISOString(),
    });

    await expect(async () => {
      await createMaintenanceWindow(mockContext, {
        data: {
          title: mockMaintenanceWindow.title,
          duration: mockMaintenanceWindow.duration,
          rRule: mockMaintenanceWindow.rRule as CreateMaintenanceWindowParams['data']['rRule'],
          categoryIds: ['invalid_id'] as unknown as MaintenanceWindow['categoryIds'],
        },
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Error validating create maintenance window data - [data.categoryIds]: types that failed validation:
      - [data.categoryIds.0.0]: types that failed validation:
       - [data.categoryIds.0.0]: expected value to equal [observability]
       - [data.categoryIds.0.1]: expected value to equal [securitySolution]
       - [data.categoryIds.0.2]: expected value to equal [management]
      - [data.categoryIds.1]: expected value to equal [null]"
    `);
  });
});
