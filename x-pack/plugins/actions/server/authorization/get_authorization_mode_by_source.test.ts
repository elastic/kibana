/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAuthorizationModeBySource,
  getBulkAuthorizationModeBySource,
  AuthorizationMode,
} from './get_authorization_mode_by_source';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { v4 as uuid } from 'uuid';
import { asSavedObjectExecutionSource } from '../lib';

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

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
          id: uuid.v4(),
        })
      )
    ).toEqual(AuthorizationMode.RBAC);
  });

  test('should return RBAC if source alert is not marked as legacy', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockAlert({ id }));
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
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } })
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
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: '7.10.0' } } })
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
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockAlert({ id, attributes: { meta: {} } }));
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

describe(`#getBulkAuthorizationModeBySource`, () => {
  test('should return RBAC if no source is provided', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [] });
    expect(await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient)).toEqual({
      [AuthorizationMode.RBAC]: 1,
      [AuthorizationMode.Legacy]: 0,
    });
  });

  test('should return RBAC if source is not an alert', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [] });
    expect(
      await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'action',
          id: uuid.v4(),
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return RBAC if source alert is not marked as legacy', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [mockAlert({ id })] });
    expect(
      await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return Legacy if source alert is marked as legacy', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } }),
      ],
    });
    expect(
      await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 0, [AuthorizationMode.Legacy]: 1 });
  });

  test('should return RBAC if source alert is marked as modern', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: '7.10.0' } } }),
      ],
    });
    expect(
      await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });

  test('should return RBAC if source alert doesnt have a last modified version', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [mockAlert({ id, attributes: { meta: {} } })],
    });
    expect(
      await getBulkAuthorizationModeBySource(unsecuredSavedObjectsClient, [
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        }),
      ])
    ).toEqual({ [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 });
  });
});

const mockAlert = (overrides: Record<string, unknown> = {}) => ({
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
