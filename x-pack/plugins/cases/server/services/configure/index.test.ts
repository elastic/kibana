/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_CONFIGURE_SAVED_OBJECT,
  ConnectorTypes,
  ESCaseConnector,
  ESCasesConfigureAttributes,
  SECURITY_SOLUTION_OWNER,
} from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { SavedObject, SavedObjectReference } from 'kibana/server';
import { configurationConnectorReferenceName } from '..';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { loggerMock } from '@kbn/logging/target/mocks';
import { CaseConfigureService } from '.';

const createConfigSO = (
  connector?: ESCaseConnector
): Promise<SavedObject<ESCasesConfigureAttributes>> => {
  const references: SavedObjectReference[] = connector
    ? [
        {
          id: connector.id,
          name: configurationConnectorReferenceName,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : [];

  return Promise.resolve({
    type: CASE_CONFIGURE_SAVED_OBJECT,
    id: '1',
    attributes: {
      // if connector is null we'll default this to an incomplete jira value because the service
      // should switch it to a none connector when the id can't be found in the references array
      connector: connector ?? {
        type: ConnectorTypes.jira,
        name: ConnectorTypes.jira,
        fields: null,
      },
      closure_type: 'close-by-pushing',
      owner: SECURITY_SOLUTION_OWNER,
      created_at: '2020-04-09T09:43:51.778Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      updated_at: '2020-04-09T09:43:51.778Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    },
    references,
  });
};

const createConnector = (overrides?: Partial<ESCaseConnector>): ESCaseConnector => {
  return {
    id: '1',
    name: ConnectorTypes.jira,
    fields: [
      { key: 'issueType', value: 'bug' },
      { key: 'priority', value: 'high' },
      { key: 'parent', value: '2' },
    ],
    type: ConnectorTypes.jira,
    ...(overrides && { ...overrides }),
  };
};

describe('CaseConfigureService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: CaseConfigureService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CaseConfigureService(mockLogger);
  });

  describe('transform between external model and Elasticsearch model', () => {
    describe('find', () => {});

    describe('get', () => {
      it('transforms an ES model connector to the external form', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(createConfigSO(createConnector()));
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

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
        expect(res.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorID",
              "type": "action",
            },
          ]
        `);
      });

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(createConfigSO());
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });

      it('defaults to the none connector when attributes is undefined', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(({
            references: [
              {
                id: '1',
                name: configurationConnectorReferenceName,
                type: ACTION_SAVED_OBJECT_TYPE,
              },
            ],
          } as unknown) as SavedObject<ESCasesConfigureAttributes>)
        );
        const res = await service.get({ unsecuredSavedObjectsClient, configurationId: '1' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });
    });
  });
});
