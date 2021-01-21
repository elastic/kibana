/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorTypes } from '../../../common/api';

import { createMockSavedObjectsRepository, mockCaseMappings } from '../../routes/api/__fixtures__';
import { createCaseClientWithMockSavedObjectsClient } from '../mocks';
import { actionsClientMock } from '../../../../actions/server/actions_client.mock';
import { mappings, mockGetFieldsResponse } from './mock';

describe('get_mappings', () => {
  const execute = jest.fn().mockReturnValue(mockGetFieldsResponse);
  const actionsMock = { ...actionsClientMock.create(), execute };
  beforeEach(async () => {
    jest.restoreAllMocks();
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  describe('happy path', () => {
    test('it gets existing mappings', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.getMappings({
        actionsClient: actionsMock,
        caseClient: caseClient.client,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });

      expect(res).toEqual(mappings[ConnectorTypes.jira]);
    });
    test('it creates new mappings', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: [],
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.getMappings({
        actionsClient: actionsMock,
        caseClient: caseClient.client,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });

      expect(res).toEqual(mappings[ConnectorTypes.jira]);
    });
  });
});
