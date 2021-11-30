/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { ConnectorTokenClient } from './connector_token_client';
import { Logger } from '../../../../../../src/core/server';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
jest.mock('../../../../src/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
}));

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createStart().getClient();

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
      expiresAt,
      token: 'testtokenvalue',
    });
    expect(result).toEqual({
      id: '1',
      connectorId: '123',
      tokenType: 'access_token',
      expiresAt,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        Object {
          "connectorId": "123",
          "tokenType": "access_token",
          "expiresAt": "${expiresAt}",
          "createdAt": "my name",
        },
        Object {
          "id": "1",
        },
      ]
    `);
  });
});

describe('get()', () => {
  test('calls unsecuredSavedObjectsClient with parameters', async () => {
    const expiresAt = new Date().toISOString();
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
            token: 'testtokenvalue',
            createdAt: new Date().toISOString(),
            expiresAt,
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });
    expect(result).toEqual([
      {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        isPreconfigured: true,
        name: 'test',
        referencedByCount: 2,
      },
    ]);
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
    const result = await connectorTokenClient.update({
      id: '1',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt,
    });
    expect(result).toEqual({
      id: '1',
      connectorId: '123',
      tokenType: 'access_token',
      token: 'testtokenvalue',
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        Object {
          "connectorId": "123",
		  "expiresAt": "${expiresAt}",
		  "token": "testtokenvalue",
		  "tokenType": "access_token",
        },
      ]
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "1",
      ]
    `);
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
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    await expect(
      connectorTokenClient.update({
        id: 'my-action',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});
