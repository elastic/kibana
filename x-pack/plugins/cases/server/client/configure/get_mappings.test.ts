/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../../common';

import {
  createMockSavedObjectsRepository,
  mockCaseMappingsResilient,
  mockCaseMappingsBad,
} from '../../routes/api/__fixtures__';
import { createCasesClientWithMockSavedObjectsClient } from '../mocks';
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
        caseMappingsSavedObject: mockCaseMappingsResilient,
      });
      const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await casesClient.client.getMappings({
        actionsClient: actionsMock,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });

      expect(res).toEqual(mappings[ConnectorTypes.resilient]);
    });
    test('it creates new mappings', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: [],
      });
      const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await casesClient.client.getMappings({
        actionsClient: actionsMock,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });

      expect(res).toEqual(mappings[ConnectorTypes.jira]);
    });
  });
  describe('unhappy path', () => {
    test('it gets existing mappings, but attributes object is empty so it creates new mappings', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappingsBad,
      });
      const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await casesClient.client.getMappings({
        actionsClient: actionsMock,
        connectorType: ConnectorTypes.jira,
        connectorId: '123',
      });

      expect(res).toEqual(mappings[ConnectorTypes.jira]);
    });
  });
});
