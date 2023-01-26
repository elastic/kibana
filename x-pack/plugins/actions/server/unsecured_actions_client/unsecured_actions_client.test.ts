/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnsecuredActionsClient } from './unsecured_actions_client';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const executionEnqueuer = jest.fn();

let unsecuredActionsClient: UnsecuredActionsClient;

beforeEach(() => {
  jest.resetAllMocks();
  unsecuredActionsClient = new UnsecuredActionsClient({
    internalSavedObjectsRepository,
    executionEnqueuer,
  });
});

describe('bulkEnqueueExecution()', () => {
  test('throws error when enqueuing execution with not allowed requester id', async () => {
    const opts = [
      {
        id: 'preconfigured1',
        params: {},
        executionId: '123abc',
      },
      {
        id: 'preconfigured2',
        params: {},
        executionId: '456def',
      },
    ];
    await expect(
      unsecuredActionsClient.bulkEnqueueExecution('badId', opts)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"badId\\" feature is not allow-listed for UnsecuredActionsClient access."`
    );
  });

  test('calls the executionEnqueuer with the appropriate parameters', async () => {
    const opts = [
      {
        id: 'preconfigured1',
        params: {},
        executionId: '123abc',
      },
      {
        id: 'preconfigured2',
        params: {},
        executionId: '456def',
      },
    ];
    await expect(
      unsecuredActionsClient.bulkEnqueueExecution('notifications', opts)
    ).resolves.toMatchInlineSnapshot(`undefined`);

    expect(executionEnqueuer).toHaveBeenCalledWith(internalSavedObjectsRepository, opts);
  });
});
