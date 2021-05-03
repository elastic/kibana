/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../../common';

import { createMockSavedObjectsRepository, mockCaseMappings } from '../../routes/api/__fixtures__';
import { createCasesClientWithMockSavedObjectsClient } from '../mocks';
import { actionsClientMock } from '../../../../actions/server/actions_client.mock';
import { actionsErrResponse, mappings, mockGetFieldsResponse } from './mock';
describe('get_default_mappings', () => {
  const execute = jest.fn().mockReturnValue(mockGetFieldsResponse);
  const actionsMock = { ...actionsClientMock.create(), execute };
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    test('it gets default mappings', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      });
      const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await casesClient.client.getDefaultMappings({
        actionsClient: actionsMock,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });
      expect(res).toEqual(mappings[ConnectorTypes.jira]);
    });
  });

  describe('unhappy path', () => {
    test('it throws error', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      });
      const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
      await casesClient.client
        .getDefaultMappings({
          actionsClient: { ...actionsMock, execute: jest.fn().mockReturnValue(actionsErrResponse) },
          connectorType: ConnectorTypes.jira,
          connectorId: '123',
        })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(424);
        });
    });
  });
});
