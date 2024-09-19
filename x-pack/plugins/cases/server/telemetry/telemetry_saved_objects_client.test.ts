/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

describe('TelemetrySavedObjectsClient', () => {
  it("find requests are extended with `namespaces:['*']`", async () => {
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);

    await telemetrySavedObjectsClient.find({ type: 'my-test-type' });
    expect(savedObjectsRepository.find).toBeCalledWith({ type: 'my-test-type', namespaces: ['*'] });
  });

  it("allow callers to overwrite the `namespaces:['*']`", async () => {
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);

    await telemetrySavedObjectsClient.find({ type: 'my-test-type', namespaces: ['some_space'] });
    expect(savedObjectsRepository.find).toBeCalledWith({
      type: 'my-test-type',
      namespaces: ['some_space'],
    });
  });
});
