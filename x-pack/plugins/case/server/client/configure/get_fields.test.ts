/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorTypes } from '../../../common/api';

import { createMockSavedObjectsRepository, mockCaseMappings } from '../../routes/api/__fixtures__';
import { createCaseClientWithMockSavedObjectsClient } from '../mocks';
import { actionsClientMock } from '../../../../actions/server/actions_client.mock';
import { actionsErrResponse, mappings, mockGetFieldsResponse } from './mock';
describe('get_fields', () => {
  const execute = jest.fn().mockReturnValue(mockGetFieldsResponse);
  const actionsMock = { ...actionsClientMock.create(), execute };
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    test('it gets fields', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.getFields({
        actionsClient: actionsMock,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });
      expect(res).toEqual({
        fields: [
          { id: 'summary', name: 'Summary', required: true, type: 'text' },
          { id: 'description', name: 'Description', required: false, type: 'text' },
        ],
        defaultMappings: mappings[ConnectorTypes.jira],
      });
    });
  });

  describe('unhappy path', () => {
    test('it throws error', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      await caseClient.client
        .getFields({
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
