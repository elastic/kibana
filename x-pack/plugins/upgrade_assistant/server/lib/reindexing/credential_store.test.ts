/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { loggingSystemMock, httpServerMock } from 'src/core/server/mocks';
import { securityMock } from '../../../../security/server/mocks';
import { ReindexStep, ReindexStatus, ReindexSavedObject } from '../../../common/types';
import { credentialStoreFactory } from './credential_store';

const basicAuthHeader = 'Basic abc';

const logMock = loggingSystemMock.create().get();
const requestMock = KibanaRequest.from(
  httpServerMock.createRawRequest({
    headers: {
      authorization: basicAuthHeader,
    },
  })
);
const securityStartMock = securityMock.createStart();

const reindexOpMock = {
  id: 'asdf',
  type: 'type',
  references: [],
  attributes: {
    indexName: 'test',
    newIndexName: 'new-index',
    status: ReindexStatus.inProgress,
    lastCompletedStep: ReindexStep.created,
    locked: null,
    reindexTaskId: null,
    reindexTaskPercComplete: null,
    errorMessage: null,
    runningReindexCount: null,
  },
} as ReindexSavedObject;

describe('credentialStore', () => {
  it('retrieves the same credentials for the same state', async () => {
    const credStore = credentialStoreFactory(logMock);

    await credStore.set({
      request: requestMock,
      reindexOp: reindexOpMock,
      security: securityStartMock,
    });

    expect(credStore.get(reindexOpMock)).toEqual({
      authorization: basicAuthHeader,
    });
  });

  it('does not retrieve credentials if the state changed', async () => {
    const credStore = credentialStoreFactory(logMock);

    await credStore.set({
      request: requestMock,
      reindexOp: reindexOpMock,
      security: securityStartMock,
    });

    reindexOpMock.attributes.lastCompletedStep = ReindexStep.readonly;

    expect(credStore.get(reindexOpMock)).toBeUndefined();
  });

  it('retrieves credentials after update', async () => {
    const credStore = credentialStoreFactory(logMock);

    await credStore.set({
      request: requestMock,
      reindexOp: reindexOpMock,
      security: securityStartMock,
    });

    const updatedReindexOp = {
      ...reindexOpMock,
      attributes: {
        ...reindexOpMock.attributes,
        status: 0,
      },
    };

    await credStore.update({
      credential: {
        authorization: basicAuthHeader,
      },
      reindexOp: updatedReindexOp,
      security: securityStartMock,
    });

    expect(credStore.get(updatedReindexOp)).toEqual({
      authorization: basicAuthHeader,
    });
  });

  describe('API keys enabled', () => {
    const apiKeyResultMock = {
      id: 'api_key_id',
      name: 'api_key_name',
      api_key: '123',
    };

    const invalidateApiKeyResultMock = {
      invalidated_api_keys: [apiKeyResultMock.api_key],
      previously_invalidated_api_keys: [],
      error_count: 0,
    };

    const base64ApiKey = Buffer.from(`${apiKeyResultMock.id}:${apiKeyResultMock.api_key}`).toString(
      'base64'
    );

    beforeEach(() => {
      securityStartMock.authc.apiKeys.areAPIKeysEnabled.mockReturnValue(Promise.resolve(true));
      securityStartMock.authc.apiKeys.grantAsInternalUser.mockReturnValue(
        Promise.resolve(apiKeyResultMock)
      );
      securityStartMock.authc.apiKeys.invalidateAsInternalUser.mockReturnValue(
        Promise.resolve(invalidateApiKeyResultMock)
      );
    });

    it('sets API key in authorization header', async () => {
      const credStore = credentialStoreFactory(logMock);

      await credStore.set({
        request: requestMock,
        reindexOp: reindexOpMock,
        security: securityStartMock,
      });

      expect(credStore.get(reindexOpMock)).toEqual({
        authorization: `ApiKey ${base64ApiKey}`,
      });
    });

    it('invalidates API keys when a reindex operation is complete', async () => {
      const credStore = credentialStoreFactory(logMock);

      await credStore.set({
        request: requestMock,
        reindexOp: reindexOpMock,
        security: securityStartMock,
      });

      await credStore.update({
        credential: {
          authorization: `ApiKey ${base64ApiKey}`,
        },
        reindexOp: {
          ...reindexOpMock,
          attributes: {
            ...reindexOpMock.attributes,
            status: 1,
          },
        },
        security: securityStartMock,
      });

      expect(securityStartMock.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalled();
    });

    it('falls back to user credentials when error granting API key', async () => {
      const credStore = credentialStoreFactory(logMock);

      securityStartMock.authc.apiKeys.grantAsInternalUser.mockRejectedValue(
        new Error('Error granting API key')
      );

      await credStore.set({
        request: requestMock,
        reindexOp: reindexOpMock,
        security: securityStartMock,
      });

      expect(credStore.get(reindexOpMock)).toEqual({
        authorization: basicAuthHeader,
      });
    });
  });
});
