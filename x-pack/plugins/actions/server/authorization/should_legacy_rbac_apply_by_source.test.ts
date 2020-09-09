/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shouldLegacyRbacApplyBySource } from './should_legacy_rbac_apply_by_source';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import uuid from 'uuid';
import { asSavedObjectExecutionSource } from '../lib';

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

describe(`#shouldLegacyRbacApplyBySource`, () => {
  test('should return false if no source is provided', async () => {
    expect(await shouldLegacyRbacApplyBySource(unsecuredSavedObjectsClient)).toEqual(false);
  });

  test('should return false if source is not an alert', async () => {
    expect(
      await shouldLegacyRbacApplyBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'action',
          id: uuid.v4(),
        })
      )
    ).toEqual(false);
  });

  test('should return false if source alert is not marked as legacy', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockAlert({ id }));
    expect(
      await shouldLegacyRbacApplyBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(false);
  });

  test('should return true if source alert is marked as legacy', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: 'pre-7.10.0' } } })
    );
    expect(
      await shouldLegacyRbacApplyBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(true);
  });

  test('should return false if source alert is marked as modern', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(
      mockAlert({ id, attributes: { meta: { versionApiKeyLastmodified: '7.10.0' } } })
    );
    expect(
      await shouldLegacyRbacApplyBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(false);
  });

  test('should return false if source alert is marked with a last modified version', async () => {
    const id = uuid.v4();
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockAlert({ id, attributes: { meta: {} } }));
    expect(
      await shouldLegacyRbacApplyBySource(
        unsecuredSavedObjectsClient,
        asSavedObjectExecutionSource({
          type: 'alert',
          id,
        })
      )
    ).toEqual(false);
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
