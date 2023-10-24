/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAuthorizationModeBySource,
  bulkGetAuthorizationModeBySource,
  AuthorizationMode,
} from './get_authorization_mode_by_source';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { v4 as uuidv4 } from 'uuid';
import { asHttpRequestExecutionSource, asSavedObjectExecutionSource } from '../lib';
import { KibanaRequest, Logger } from '@kbn/core/server';

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe(`#getAuthorizationModeBySource`, () => {
  test('should return RBAC if no source is provided', async () => {
    expect(await getAuthorizationModeBySource(unsecuredSavedObjectsClient)).toEqual(
      AuthorizationMode.RBAC
    );
  });

  test('should return RBAC if source is not an alert', async () => {
    expect(
      await getAuthorizationModeBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'action',
          id: uuidv4(),
        })
      )
    ).toEqual(AuthorizationMode.RBAC);
  });

  test('should return RBAC if source alert is not marked as legacy', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockRuleSO({ id }));
    expect(
      await getAuthorizationModeBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(AuthorizationMode.RBAC);
  });

  test('should return Legacy if source alert is marked as legacy', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockRuleSO({ id, attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } })
    );
    expect(
      await getAuthorizationModeBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(AuthorizationMode.Legacy);
  });

  test('should return RBAC if source alert is marked as modern', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockRuleSO({ id, attributes: { meta: { versionApiKeyLastmodified: '7.10.0' } } })
    );
    expect(
      await getAuthorizationModeBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(AuthorizationMode.RBAC);
  });

  test('should return RBAC if source alert doesnt have a last modified version', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockRuleSO({ id, attributes: { meta: {} } }));
    expect(
      await getAuthorizationModeBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(AuthorizationMode.RBAC);
  });
});

describe(`#bulkGetAuthorizationModeBySource`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return RBAC if no sources are provided', async () => {
    expect(await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient)).toEqual({
      [AuthorizationMode.RBAC]: 1,
      [AuthorizationMode.Legacy]: 0,
    });
    expect(unsecuredSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('should return RBAC if no alert sources are provided', async () => {
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'action',
          id: uuidv4(),
        }),
        asHttpRequestExecutionSource({} as KibanaRequest),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });

    expect(unsecuredSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('should consolidate duplicate alert sources', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [mockRuleSO({ id: '1' }), mockRuleSO({ id: '2' })],
    });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id: '1',
        }),
        asSavedObjectExecutionSource({
          type: 'alert',
          id: '1',
        }),
        asSavedObjectExecutionSource({
          type: 'alert',
          id: '2',
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 2, [AuthorizationMode.Legacy]: 0 });

    expect(unsecuredSavedObjectsClient.bulkGet).toHaveBeenCalledWith([
      {
        type: 'alert',
        id: '1',
      },
      {
        type: 'alert',
        id: '2',
      },
    ]);
  });

  test('should return RBAC if source alert is not marked as legacy', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [mockRuleSO({ id })] });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return Legacy if source alert is marked as legacy', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        mockRuleSO({ id, attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } }),
      ],
    });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 0, [AuthorizationMode.Legacy]: 1 });
  });

  test('should return RBAC if source alert is marked as modern', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        mockRuleSO({ id, attributes: { meta: { versionApiKeyLastmodified: '7.10.0' } } }),
      ],
    });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return RBAC if source alert doesnt have a last modified version', async () => {
    const id = uuidv4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [mockRuleSO({ id, attributes: { meta: {} } })],
    });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return RBAC and log warning if error getting source alert', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        mockRuleSO({ id: '1', attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } }),
        // @ts-expect-error
        {
          id: '2',
          type: 'alert',
          error: { statusCode: 404, error: 'failed to get', message: 'fail' },
        },
      ],
    });
    expect(
      await bulkGetAuthorizationModeBySource(logger, unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id: '1',
        }),
        asSavedObjectExecutionSource({
          type: 'alert',
          id: '2',
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 1 });

    expect(logger.warn).toHaveBeenCalledWith(
      `Error retrieving saved object [alert/2] - fail - default to using RBAC authorization mode.`
    );
  });
});

const mockRuleSO = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  type: 'alert',
  attributes: {
    consumer: 'myApp',
    schedule: { interval: '10s' },
    alertTypeId: 'myType',
    enabled: false,
    actions: [
      {
        group: 'default',
        id: '1',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
  },
  version: '123',
  references: [],
  ...overrides,
});
