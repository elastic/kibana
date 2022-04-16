/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { ConnectorTokenClient } from './connector_token_client';
import { Logger } from '@kbn/core/server';
import { ConnectorToken } from '../../types';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
jest.mock('@kbn/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
}));

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

let connectorTokenClient: ConnectorTokenClient;

beforeEach(() => {
  jest.resetAllMocks();
  connectorTokenClient = new ConnectorTokenClient({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
  });
});

describe('create()', () => {
  test('creates connector_token with all given properties', async () => {
    const expiresAt = new Date().toISOString();
    const savedObjectCreateResult = {
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      },
      references: [],
    };

    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await connectorTokenClient.create({
      connectorId: '123',
      expiresAtMillis: expiresAt,
      token: 'testtokenvalue',
    });
    expect(result).toEqual({
      connectorId: '123',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'testtokenvalue'
    );
  });
});

describe('get()', () => {
  test('calls unsecuredSavedObjectsClient with parameters', async () => {
    const expiresAt = new Date().toISOString();
    const createdAt = new Date().toISOString();
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt,
            expiresAt,
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      references: [],
      attributes: {
        token: 'testtokenvalue',
      },
    });
    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });
    expect(result).toEqual({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt,
        expiresAt,
      },
    });
  });

  test('return null if there is not tokens for connectorId', async () => {
    const expectedResult = {
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });
    expect(result).toEqual({ connectorToken: null, hasErrors: false });
  });

  test('return null and log the error if unsecuredSavedObjectsClient thows an error', async () => {
    unsecuredSavedObjectsClient.find.mockRejectedValueOnce(new Error('Fail'));

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });

    expect(logger.error.mock.calls[0]).toMatchObject([
      `Failed to fetch connector_token for connectorId "123" and tokenType: "access_token". Error: Fail`,
    ]);
    expect(result).toEqual({ connectorToken: null, hasErrors: true });
  });

  test('return null and log the error if encryptedSavedObjectsClient decrypt method thows an error', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });

    expect(logger.error.mock.calls[0]).toMatchObject([
      `Failed to decrypt connector_token for connectorId "123" and tokenType: "access_token". Error: Fail`,
    ]);
    expect(result).toEqual({ connectorToken: null, hasErrors: true });
  });
});

describe('update()', () => {
  test('updates the connector token with all given properties', async () => {
    const expiresAt = new Date().toISOString();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.checkConflicts.mockResolvedValueOnce({
      errors: [],
    });
    const result = await connectorTokenClient.update({
      id: '1',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAtMillis: expiresAt,
    });
    expect(result).toEqual({
      connectorId: '123',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'testtokenvalue'
    );
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "1",
      ]
    `);
  });

  test('should log error, when failed to update the connector token if there are a conflict errors', async () => {
    const expiresAt = new Date().toISOString();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.checkConflicts.mockResolvedValueOnce({
      errors: [
        {
          id: '1',
          error: {
            error: 'error',
            statusCode: 503,
            message: 'There is a conflict.',
          },
          type: 'conflict',
        },
      ],
    });

    const result = await connectorTokenClient.update({
      id: '1',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAtMillis: expiresAt,
    });
    expect(result).toEqual(null);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(0);
    expect(logger.error.mock.calls[0]).toMatchObject([
      'Failed to update connector_token for id "1" and tokenType: "access_token". Error: There is a conflict. ',
    ]);
  });

  test('throws an error when unsecuredSavedObjectsClient throws', async () => {
    const expiresAt = new Date().toISOString();
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.checkConflicts.mockResolvedValueOnce({
      errors: [],
    });
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    await expect(
      connectorTokenClient.update({
        id: 'my-action',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAtMillis: expiresAt,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

describe('delete()', () => {
  test('calls unsecuredSavedObjectsClient delete for all connector token records by connectorId', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValue(expectedResult);

    const findResult = {
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: 'token1',
          type: 'connector_token',
          attributes: {
            connectorId: '1',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
        {
          id: 'token2',
          type: 'connector_token',
          attributes: {
            connectorId: '1',
            tokenType: 'refresh_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(findResult);
    const result = await connectorTokenClient.deleteConnectorTokens({ connectorId: '1' });
    expect(JSON.stringify(result)).toEqual(JSON.stringify([Symbol(), Symbol()]));
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "token1",
      ]
    `);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "token2",
      ]
    `);
  });
});
