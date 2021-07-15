/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseConnector,
  CasesConfigureAttributes,
  CasesConfigurePatch,
  CASE_CONFIGURE_SAVED_OBJECT,
  ConnectorTypes,
  ESCaseConnector,
  ESCasesConfigureAttributes,
  SECURITY_SOLUTION_OWNER,
} from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { configurationConnectorReferenceName } from '..';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { loggerMock } from '@kbn/logging/target/mocks';
import { CaseConfigureService } from '.';
import { getNoneCaseConnector } from '../../common';

const basicConfigFields = {
  closure_type: 'close-by-pushing' as const,
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
};

const createConfigUpdateParams = (
  connector?: CaseConnector
): Partial<CasesConfigureAttributes> => ({
  connector,
});

const createConfigPostParams = (connector: CaseConnector): CasesConfigureAttributes => ({
  ...basicConfigFields,
  connector,
});

const createUpdateConfigSO = (
  connector?: ESCaseConnector
): SavedObjectsUpdateResponse<ESCasesConfigureAttributes> => {
  const references: SavedObjectReference[] =
    connector && connector.id !== 'none'
      ? [
          {
            id: connector.id,
            name: configurationConnectorReferenceName,
            type: ACTION_SAVED_OBJECT_TYPE,
          },
        ]
      : [];

  return {
    type: CASE_CONFIGURE_SAVED_OBJECT,
    id: '1',
    attributes: {
      connector: connector
        ? { name: connector.name, type: connector.type, fields: connector.fields }
        : undefined,
    },
    version: '1',
    references,
  };
};

const createConfigSO = (connector?: ESCaseConnector): SavedObject<ESCasesConfigureAttributes> => {
  const references: SavedObjectReference[] = connector
    ? [
        {
          id: connector.id,
          name: configurationConnectorReferenceName,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : [];

  const formattedConnector = {
    type: connector?.type ?? ConnectorTypes.jira,
    name: connector?.name ?? ConnectorTypes.jira,
    fields: connector?.fields ?? null,
  };

  return {
    type: CASE_CONFIGURE_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...basicConfigFields,
      // if connector is null we'll default this to an incomplete jira value because the service
      // should switch it to a none connector when the id can't be found in the references array
      connector: formattedConnector,
    },
    references,
  };
};

const createConfigSOPromise = (
  connector?: ESCaseConnector
): Promise<SavedObject<ESCasesConfigureAttributes>> => Promise.resolve(createConfigSO(connector));

const createConfigFindSO = (
  connector?: ESCaseConnector
): SavedObjectsFindResult<ESCasesConfigureAttributes> => ({
  ...createConfigSO(connector),
  score: 0,
});

const createSOFindResponse = (
  savedObjects: Array<SavedObjectsFindResult<ESCasesConfigureAttributes>>
) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  per_page: savedObjects.length,
  page: 1,
});

const createESConnector = (overrides?: Partial<ESCaseConnector>): ESCaseConnector => {
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

const createJiraConnector = (setFieldsToNull?: boolean): CaseConnector => {
  return {
    id: '1',
    name: ConnectorTypes.jira,
    type: ConnectorTypes.jira,
    fields: setFieldsToNull
      ? null
      : {
          issueType: 'bug',
          priority: 'high',
          parent: '2',
        },
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
    describe('patch', () => {
      describe('formats the update attributes', () => {
        it('formats the update saved object', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<CasesConfigurePatch>)
          );

          await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigPostParams(createJiraConnector()),
          });

          expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
            Object {
              "closure_type": "close-by-pushing",
              "connector": Object {
                "fields": Array [
                  Object {
                    "key": "issueType",
                    "value": "bug",
                  },
                  Object {
                    "key": "priority",
                    "value": "high",
                  },
                  Object {
                    "key": "parent",
                    "value": "2",
                  },
                ],
                "name": ".jira",
                "type": ".jira",
              },
              "created_at": "2020-04-09T09:43:51.778Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "owner": "securitySolution",
              "updated_at": "2020-04-09T09:43:51.778Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
            }
          `);
        });

        it('transforms the update connector schema to ES schema', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<CasesConfigurePatch>)
          );

          await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigPostParams(createJiraConnector()),
          });

          const updateAttributes = unsecuredSavedObjectsClient.update.mock
            .calls[0][2] as Partial<CasesConfigureAttributes>;
          expect(updateAttributes.connector).toMatchInlineSnapshot(`
            Object {
              "fields": Array [
                Object {
                  "key": "issueType",
                  "value": "bug",
                },
                Object {
                  "key": "priority",
                  "value": "high",
                },
                Object {
                  "key": "parent",
                  "value": "2",
                },
              ],
              "name": ".jira",
              "type": ".jira",
            }
          `);
          expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
            Object {
              "references": Array [
                Object {
                  "id": "1",
                  "name": "connectorID",
                  "type": "action",
                },
              ],
            }
          `);
        });

        it('formats the saved object without a connector', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<CasesConfigurePatch>)
          );

          await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(),
          });

          expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(
            `Object {}`
          );
          expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
            Object {
              "references": undefined,
            }
          `);
        });

        it('returns the none connector after update', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<CasesConfigurePatch>)
          );

          await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(getNoneCaseConnector()),
          });

          expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
            Object {
              "connector": Object {
                "fields": Array [],
                "name": "none",
                "type": ".none",
              },
            }
          `);
        });
      });

      describe('transforming to external model', () => {
        it('returns an object with a none connector and without a reference', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve(createUpdateConfigSO(getNoneCaseConnector()))
          );

          const res = await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(),
          });

          expect(res.attributes).toMatchInlineSnapshot(`
            Object {
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
            }
          `);
          expect(res.references).toMatchInlineSnapshot(`Array []`);
        });

        it('returns an undefined connector if it is not returned by the update', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<ESCasesConfigureAttributes>)
          );

          const res = await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(),
          });

          expect(res).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {},
            }
          `);
        });

        it('returns the default none connector when it cannot find the reference', async () => {
          const { name, type, fields } = createESConnector();
          const returnValue: SavedObjectsUpdateResponse<ESCasesConfigureAttributes> = {
            type: CASE_CONFIGURE_SAVED_OBJECT,
            id: '1',
            attributes: {
              connector: {
                name,
                type,
                fields,
              },
            },
            version: '1',
            references: undefined,
          };

          unsecuredSavedObjectsClient.update.mockReturnValue(Promise.resolve(returnValue));

          const res = await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(),
          });

          expect(res).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "connector": Object {
                  "fields": null,
                  "id": "none",
                  "name": "none",
                  "type": ".none",
                },
              },
              "id": "1",
              "references": undefined,
              "type": "cases-configure",
              "version": "1",
            }
          `);
        });

        it('returns the connector in the external schema', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve(createUpdateConfigSO(createESConnector()))
          );

          const res = await service.patch({
            configurationId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createConfigUpdateParams(),
          });

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
        });
      });
    });

    describe('post', () => {
      it('transforms the creation attributes to the ES acceptable form', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCasesConfigureAttributes>)
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
          Object {
            "closure_type": "close-by-pushing",
            "connector": Object {
              "fields": Array [
                Object {
                  "key": "issueType",
                  "value": "bug",
                },
                Object {
                  "key": "priority",
                  "value": "high",
                },
                Object {
                  "key": "parent",
                  "value": "2",
                },
              ],
              "name": ".jira",
              "type": ".jira",
            },
            "created_at": "2020-04-09T09:43:51.778Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "owner": "securitySolution",
            "updated_at": "2020-04-09T09:43:51.778Z",
            "updated_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": Array [
              Object {
                "id": "1",
                "name": "connectorID",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('transforms the connector in the ES schema', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCasesConfigureAttributes>)
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector()),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CasesConfigureAttributes;
        expect(postAttributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "bug",
              },
              Object {
                "key": "priority",
                "value": "high",
              },
              Object {
                "key": "parent",
                "value": "2",
              },
            ],
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": Array [
              Object {
                "id": "1",
                "name": "connectorID",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('sets fields to an empty array when it is not included', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCasesConfigureAttributes>)
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(createJiraConnector(true)),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CasesConfigureAttributes;
        expect(postAttributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": Array [],
            "name": ".jira",
            "type": ".jira",
          }
        `);
      });

      it('does not create a reference for a none connector', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCasesConfigureAttributes>)
        );

        await service.post({
          unsecuredSavedObjectsClient,
          attributes: createConfigPostParams(getNoneCaseConnector()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": undefined,
          }
        `);
      });
    });

    describe('find', () => {
      it('includes the id field in the response', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        expect(res.saved_objects[0].attributes.connector).toMatchInlineSnapshot(`
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
      });

      it('includes the saved object find response fields in the result', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        const { saved_objects: ignored, ...findResponseFields } = res;
        expect(findResponseFields).toMatchInlineSnapshot(`
          Object {
            "page": 1,
            "per_page": 2,
            "total": 2,
          }
        `);
      });

      it('defaults to the none connector when the id cannot be found in the references', async () => {
        const findMockReturn = createSOFindResponse([
          createConfigFindSO(createESConnector()),
          createConfigFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.find({ unsecuredSavedObjectsClient });
        expect(res.saved_objects[1].attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });
    });

    describe('get', () => {
      it('includes the id field in the response', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(createConfigSOPromise(createESConnector()));
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
      });

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(createConfigSOPromise());
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
