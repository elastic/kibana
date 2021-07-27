/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseAttributes,
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
import { createESConnector, createJiraConnector } from '../test_utils';

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

const createSOResponse = ({
  connector,
  externalService,
}: {
  connector?: ESCaseConnector;
  externalService?: CaseFullExternalService;
} = {}): SavedObject<ESCaseAttributes> => {
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

const createFindSO = (
  params: {
    connector?: ESCaseConnector;
    externalService?: CaseFullExternalService;
  } = {}
): SavedObjectsFindResult<ESCaseAttributes> => ({
  ...createSOResponse(params),
  score: 0,
});

const createSOFindResponse = (savedObjects: Array<SavedObjectsFindResult<ESCaseAttributes>>) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  per_page: savedObjects.length,
  page: 1,
});

const createCasePostParams = (
  connector: CaseConnector,
  externalService?: CaseFullExternalService
): CaseAttributes => ({
  ...basicCaseFields,
  connector,
  ...(externalService ? { external_service: externalService } : { external_service: null }),
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
    describe('patch', () => {
      describe('formats the update attributes', () => {
        it('formats the update saved object', async () => {
          unsecuredSavedObjectsClient.update.mockReturnValue(
            Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
          );

          await service.patchCase({
            caseId: '1',
            unsecuredSavedObjectsClient,
            updatedAttributes: createCasePostParams(createJiraConnector(), createExternalService()),
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
    });

    describe('post', () => {
      it('transforms the creation attributes to the ES acceptable form', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(), createExternalService()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
          Object {
            "closed_at": null,
            "closed_by": null,
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
            "created_at": "2019-11-25T21:54:48.952Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "description": "This is a brand new case of a bad meanie defacing data",
            "external_service": Object {
              "connector_name": ".jira",
              "external_id": "100",
              "external_title": "awesome",
              "external_url": "http://www.google.com",
              "pushed_at": "2019-11-25T21:54:48.952Z",
              "pushed_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
            },
            "owner": "securitySolution",
            "settings": Object {
              "syncAlerts": true,
            },
            "status": "open",
            "tags": Array [
              "defacement",
            ],
            "title": "Super Bad Security Issue",
            "type": "individual",
            "updated_at": "2019-11-25T21:54:48.952Z",
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
              Object {
                "id": "100",
                "name": "pushConnectorID",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('transforms the connector in the ES schema', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(), createExternalService()),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
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
              Object {
                "id": "100",
                "name": "pushConnectorID",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('transforms the external service in the ES schema so that it does not have connector_id', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(), createExternalService()),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
        expect(postAttributes.external_service).toMatchInlineSnapshot(`
          Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('sets fields to an empty array when it is not included', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(true), createExternalService()),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
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
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector(), createExternalService()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": Array [
              Object {
                "id": "100",
                "name": "pushConnectorID",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('does not create a reference for an external service field that is null', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector()),
          id: '1',
        });

        expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
          Object {
            "id": "1",
            "references": undefined,
          }
        `);
      });

      it('includes the id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve(
            createSOResponse({
              connector: createESConnector(),
              externalService: createExternalService(),
            })
          )
        );

        const res = await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector()),
          id: '1',
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
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });
    });

    describe('find', () => {
      it('includes the id field in the response', async () => {
        const findMockReturn = createSOFindResponse([
          createFindSO({
            connector: createESConnector(),
            externalService: createExternalService(),
          }),
          createFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.findCases({ unsecuredSavedObjectsClient });
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
          createFindSO({
            connector: createESConnector(),
            externalService: createExternalService(),
          }),
          createFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.findCases({ unsecuredSavedObjectsClient });
        const { saved_objects: ignored, ...findResponseFields } = res;
        expect(findResponseFields).toMatchInlineSnapshot(`
          Object {
            "page": 1,
            "per_page": 2,
            "total": 2,
          }
        `);
      });
    });

    describe('bulkGet', () => {
      it('includes the id field in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockReturnValue(
          Promise.resolve({
            saved_objects: [
              createSOResponse({
                connector: createESConnector(),
                externalService: createExternalService(),
              }),
              createSOResponse({
                connector: createESConnector({ id: '2' }),
                externalService: createExternalService({ connector_id: '200' }),
              }),
            ],
          })
        );

        const res = await service.getCases({ unsecuredSavedObjectsClient, caseIds: ['a'] });

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
        expect(
          res.saved_objects[1].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"200"`);

        expect(res.saved_objects[1].attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "id": "2",
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(
          res.saved_objects[0].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"100"`);
      });
    });

    describe('get', () => {
      it('includes the id field in the response', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(
            createSOResponse({
              connector: createESConnector(),
              externalService: createExternalService(),
            })
          )
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

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(createSOResponse({ externalService: createExternalService() }))
        );
        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);
      });

      it('sets external services to null when the connector id cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(Promise.resolve(createSOResponse()));
        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.external_service).toMatchInlineSnapshot(`null`);
      });

      it('defaults to the none connector and null external services when attributes is undefined', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(({
            references: [
              {
                id: '1',
                name: connectorIDReferenceName,
                type: ACTION_SAVED_OBJECT_TYPE,
              },
            ],
          } as unknown) as SavedObject<ESCaseAttributes>)
        );
        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          }
        `);

        expect(res.attributes.external_service).toMatchInlineSnapshot(`null`);
      });
    });
  });
});
