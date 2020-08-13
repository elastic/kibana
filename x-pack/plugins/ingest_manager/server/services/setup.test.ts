/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupIngestManager } from './setup';
import { savedObjectsClientMock } from 'src/core/server/mocks';

describe('setupIngestManager', () => {
  it('returned promise should reject if errors thrown', async () => {
    const { savedObjectsClient, callClusterMock } = makeErrorMocks();
    const setupPromise = setupIngestManager(savedObjectsClient, callClusterMock);
    await expect(setupPromise).rejects.toThrow('mocked');
  });
});

function makeErrorMocks() {
  jest.mock('./app_context'); // else fails w/"Logger not set."
  jest.mock('./epm/registry/registry_url', () => {
    return {
      fetchUrl: () => {
        throw new Error('mocked registry#fetchUrl');
      },
    };
  });

  const callClusterMock = jest.fn();
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.find = jest.fn().mockImplementation(() => {
    throw new Error('mocked SO#find');
  });
  savedObjectsClient.get = jest.fn().mockImplementation(() => {
    throw new Error('mocked SO#get');
  });
  savedObjectsClient.update = jest.fn().mockImplementation(() => {
    throw new Error('mocked SO#update');
  });

  return {
    savedObjectsClient,
    callClusterMock,
  };
}
