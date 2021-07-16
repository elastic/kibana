/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseConnector,
  CaseFullExternalService,
  CasesConfigureAttributes,
  CasesConfigurePatch,
  CaseStatuses,
  CaseType,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  ConnectorTypes,
  ESCaseConnector,
  SECURITY_SOLUTION_OWNER,
} from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { connectorIDReferenceName, pushConnectorIDReferenceName } from '..';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { loggerMock } from '@kbn/logging/target/mocks';
import { getNoneCaseConnector } from '../../common';
import { CasesService, ESCaseAttributes } from '.';
import { createESConnector } from '../test_utils';

const basicCaseFields = {
  closed_at: null,
  closed_by: null,
  created_at: '2019-11-25T21:54:48.952Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  status: CaseStatuses.open,
  tags: ['defacement'],
  type: CaseType.individual,
  updated_at: '2019-11-25T21:54:48.952Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  settings: {
    syncAlerts: true,
  },
  owner: SECURITY_SOLUTION_OWNER,
};

const createSOResponse = (
  connector?: ESCaseConnector,
  externalService?: CaseFullExternalService
): SavedObject<ESCaseAttributes> => {
  const references: SavedObjectReference[] = [
    ...(connector
      ? [
          {
            id: connector.id,
            name: connectorIDReferenceName,
            type: ACTION_SAVED_OBJECT_TYPE,
          },
        ]
      : []),
    ...(externalService
      ? [
          {
            id: externalService.connector_id,
            name: pushConnectorIDReferenceName,
            type: ACTION_SAVED_OBJECT_TYPE,
          },
        ]
      : []),
  ];

  const formattedConnector = {
    type: connector?.type ?? ConnectorTypes.jira,
    name: connector?.name ?? ConnectorTypes.jira,
    fields: connector?.fields ?? null,
  };

  const { connector_id: ignored, ...restExternalService } = externalService ?? {
    connector_name: '.jira',
    external_id: '100',
    external_title: 'awesome',
    external_url: 'http://www.google.com',
    pushed_at: '2019-11-25T21:54:48.952Z',
    pushed_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
  };

  return {
    type: CASE_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...basicCaseFields,
      // if connector is null we'll default this to an incomplete jira value because the service
      // should switch it to a none connector when the id can't be found in the references array
      connector: formattedConnector,
      external_service: restExternalService,
    },
    references,
  };
};

const createExternalService = (
  overrides?: Partial<CaseFullExternalService>
): CaseFullExternalService => ({
  connector_id: '100',
  connector_name: '.jira',
  external_id: '100',
  external_title: 'awesome',
  external_url: 'http://www.google.com',
  pushed_at: '2019-11-25T21:54:48.952Z',
  pushed_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  ...(overrides && { ...overrides }),
});

describe('CasesService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: CasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesService(mockLogger);
  });

  describe('transform between external model and Elasticsearch model', () => {
    describe('get', () => {
      it('includes the id field in the response', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(createSOResponse(createESConnector(), createExternalService()))
        );

        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "id": "1",
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });
    });
  });
});
