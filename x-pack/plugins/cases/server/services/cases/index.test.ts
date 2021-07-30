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
  CASE_SAVED_OBJECT,
} from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsCreateOptions,
  SavedObjectsFindResult,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { connectorIdReferenceName } from '..';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { loggerMock } from '@kbn/logging/target/mocks';
import { getNoneCaseConnector } from '../../common';
import { CasesService, ESCaseAttributes } from '.';
import {
  createESJiraConnector,
  createJiraConnector,
  ESCaseConnectorWithId,
  createExternalService,
  createSavedObjectReferences,
  createCaseSavedObjectResponse,
  basicCaseFields,
} from '../test_utils';

const createUpdateSOResponse = ({
  connector,
  externalService,
}: {
  connector?: ESCaseConnectorWithId;
  externalService?: CaseFullExternalService;
} = {}): SavedObjectsUpdateResponse<ESCaseAttributes> => {
  const references: SavedObjectReference[] = createSavedObjectReferences({
    connector,
    externalService,
  });

  let attributes: Partial<ESCaseAttributes> = {};

  if (connector) {
    const { id, ...restConnector } = connector;
    attributes = { ...attributes, connector: { ...restConnector } };
  }

  if (externalService) {
    const { connector_id: id, ...restService } = externalService;
    attributes = { ...attributes, external_service: { ...restService } };
  } else if (externalService === null) {
    attributes = { ...attributes, external_service: null };
  }

  return {
    type: CASE_SAVED_OBJECT,
    id: '1',
    attributes,
    references,
  };
};

const createFindSO = (
  params: {
    connector?: ESCaseConnectorWithId;
    externalService?: CaseFullExternalService;
  } = {}
): SavedObjectsFindResult<ESCaseAttributes> => ({
  ...createCaseSavedObjectResponse(params),
  score: 0,
});

const createSOFindResponse = (savedObjects: Array<SavedObjectsFindResult<ESCaseAttributes>>) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  per_page: savedObjects.length,
  page: 1,
});

const createCaseUpdateParams = (
  connector?: CaseConnector,
  externalService?: CaseFullExternalService
): Partial<CaseAttributes> => ({
  ...(connector && { connector }),
  ...(externalService && { external_service: externalService }),
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

  describe('transforms the external model to the Elasticsearch model', () => {
    describe('patch', () => {
      it('includes the passed in fields', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCasePostParams(createJiraConnector(), createExternalService()),
        });

        const {
          connector: ignoreConnector,
          external_service: ignoreExternalService,
          ...restUpdateAttributes
        } = unsecuredSavedObjectsClient.update.mock.calls[0][2] as Partial<ESCaseAttributes>;
        expect(restUpdateAttributes).toMatchInlineSnapshot(`
          Object {
            "closed_at": null,
            "closed_by": null,
            "created_at": "2019-11-25T21:54:48.952Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "description": "This is a brand new case of a bad meanie defacing data",
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
      });

      it('transforms the connector.fields to an array of key/value pairs', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCasePostParams(createJiraConnector(), createExternalService()),
        });

        const { connector } = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ESCaseAttributes>;
        expect(connector?.fields).toMatchInlineSnapshot(`
          Array [
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
          ]
        `);
      });

      it('preserves the connector fields but does not have the id', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCasePostParams(createJiraConnector(), createExternalService()),
        });

        const { connector } = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ESCaseAttributes>;
        expect(connector).toMatchInlineSnapshot(`
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
      });

      it('removes the connector id and adds it to the references', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(createJiraConnector()),
        });

        const updateAttributes = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ESCaseAttributes>;
        expect(updateAttributes.connector).not.toHaveProperty('id');

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions<unknown>;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('removes the external_service connector_id and adds it to the references', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCasePostParams(getNoneCaseConnector(), createExternalService()),
        });

        const updateAttributes = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ESCaseAttributes>;
        expect(updateAttributes.external_service).not.toHaveProperty('connector_id');

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions<unknown>;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('preserves the external_service fields except for the connector_id', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCasePostParams(getNoneCaseConnector(), createExternalService()),
        });

        const updateAttributes = unsecuredSavedObjectsClient.update.mock
          .calls[0][2] as Partial<ESCaseAttributes>;
        expect(updateAttributes.external_service).toMatchInlineSnapshot(`
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

      it('creates an empty updatedAttributes when there is no connector or external_service as input', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(
          `Object {}`
        );
        expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
          Object {
            "references": undefined,
            "version": undefined,
          }
        `);
      });

      it('creates a updatedAttributes field with the none connector', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(getNoneCaseConnector()),
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

    describe('post', () => {
      it('creates a null external_service field when the attribute was null in the creation parameters', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector()),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
        expect(postAttributes.external_service).toMatchInlineSnapshot(`null`);
      });

      it('includes the creation attributes excluding the connector.id and connector_id', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(), createExternalService()),
          id: '1',
        });

        const creationAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as ESCaseAttributes;
        expect(creationAttributes.connector).not.toHaveProperty('id');
        expect(creationAttributes.external_service).not.toHaveProperty('connector_id');
        expect(creationAttributes).toMatchInlineSnapshot(`
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
                "name": "connectorId",
                "type": "action",
              },
              Object {
                "id": "100",
                "name": "pushConnectorId",
                "type": "action",
              },
            ],
          }
        `);
      });

      it('moves the connector.id and connector_id to the references', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(createJiraConnector(), createExternalService()),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('sets fields to an empty array when it is not included with the connector', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(
            createJiraConnector({ setFieldsToNull: true }),
            createExternalService()
          ),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
        expect(postAttributes.connector.fields).toEqual([]);
      });

      it('does not create a reference for a none connector', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector()),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toBeUndefined();
      });

      it('does not create a reference for an external_service field that is null', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve({} as SavedObject<ESCaseAttributes>)
        );

        await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector()),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toBeUndefined();
      });
    });
  });

  describe('transforms the Elasticsearch model to the external model', () => {
    describe('bulkPatch', () => {
      it('formats the update saved object by including the passed in fields and transforming the connector.fields', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockReturnValue(
          Promise.resolve({
            saved_objects: [
              createCaseSavedObjectResponse({
                connector: createESJiraConnector(),
                externalService: createExternalService(),
              }),
              createCaseSavedObjectResponse({
                connector: createESJiraConnector({ id: '2' }),
                externalService: createExternalService({ connector_id: '200' }),
              }),
            ],
          })
        );

        const res = await service.patchCases({
          unsecuredSavedObjectsClient,
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams(
                createJiraConnector(),
                createExternalService()
              ),
            },
          ],
        });

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

    describe('patch', () => {
      it('returns an object with a none connector and without a reference when it was set to a none connector in the update', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateSOResponse({ connector: getNoneCaseConnector() }))
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
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

      it('returns an object with a null external service and without a reference when it was set to null in the update', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateSOResponse({ externalService: null }))
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res.attributes).toMatchInlineSnapshot(`
            Object {
              "external_service": null,
            }
          `);
        expect(res.references).toMatchInlineSnapshot(`Array []`);
      });

      it('returns an empty object when neither the connector or external service was updated', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateSOResponse())
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res.attributes).toMatchInlineSnapshot(`Object {}`);
        expect(res.references).toMatchInlineSnapshot(`Array []`);
      });

      it('returns an undefined connector if it is not returned by the update', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve({} as SavedObjectsUpdateResponse<ESCaseAttributes>)
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {},
            }
          `);
      });

      it('returns the default none connector when it cannot find the reference', async () => {
        const { name, type, fields } = createESJiraConnector();
        const returnValue: SavedObjectsUpdateResponse<ESCaseAttributes> = {
          type: CASE_SAVED_OBJECT,
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

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res.attributes.connector).toMatchInlineSnapshot(`
            Object {
              "fields": null,
              "id": "none",
              "name": "none",
              "type": ".none",
            }
          `);
      });

      it('returns a null external service connector when it cannot find the reference', async () => {
        const { connector_id: id, ...restExternalConnector } = createExternalService()!;
        const returnValue: SavedObjectsUpdateResponse<ESCaseAttributes> = {
          type: CASE_SAVED_OBJECT,
          id: '1',
          attributes: {
            external_service: restExternalConnector,
          },
          version: '1',
          references: undefined,
        };

        unsecuredSavedObjectsClient.update.mockReturnValue(Promise.resolve(returnValue));

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res.attributes.external_service?.connector_id).toBeNull();
      });

      it('returns the saved object fields when it cannot find the reference for connector_id', async () => {
        const { connector_id: id, ...restExternalConnector } = createExternalService()!;
        const returnValue: SavedObjectsUpdateResponse<ESCaseAttributes> = {
          type: CASE_SAVED_OBJECT,
          id: '1',
          attributes: {
            external_service: restExternalConnector,
          },
          version: '1',
          references: undefined,
        };

        unsecuredSavedObjectsClient.update.mockReturnValue(Promise.resolve(returnValue));

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "external_service": Object {
                  "connector_id": null,
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
              },
              "id": "1",
              "references": undefined,
              "type": "cases",
              "version": "1",
            }
          `);
      });

      it('returns the connector.id after finding the reference', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateSOResponse({ connector: createESJiraConnector() }))
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
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
        expect(res.attributes.connector?.id).toMatchInlineSnapshot(`"1"`);
      });

      it('returns the external_service connector_id after finding the reference', async () => {
        unsecuredSavedObjectsClient.update.mockReturnValue(
          Promise.resolve(createUpdateSOResponse({ externalService: createExternalService() }))
        );

        const res = await service.patchCase({
          caseId: '1',
          unsecuredSavedObjectsClient,
          updatedAttributes: createCaseUpdateParams(),
        });

        expect(res.attributes.external_service).toMatchInlineSnapshot(`
            Object {
              "connector_id": "100",
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
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });
    });

    describe('post', () => {
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.create.mockReturnValue(
          Promise.resolve(
            createCaseSavedObjectResponse({
              connector: createESJiraConnector(),
              externalService: createExternalService(),
            })
          )
        );

        const res = await service.postNewCase({
          unsecuredSavedObjectsClient,
          attributes: createCasePostParams(getNoneCaseConnector()),
          id: '1',
        });

        expect(res.attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });
    });

    describe('find', () => {
      it('includes the connector.id and connector_id field in the response', async () => {
        const findMockReturn = createSOFindResponse([
          createFindSO({
            connector: createESJiraConnector(),
            externalService: createExternalService(),
          }),
          createFindSO(),
        ]);
        unsecuredSavedObjectsClient.find.mockReturnValue(Promise.resolve(findMockReturn));

        const res = await service.findCases({ unsecuredSavedObjectsClient });
        expect(res.saved_objects[0].attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(
          res.saved_objects[0].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"100"`);
      });

      it('includes the saved object find response fields in the result', async () => {
        const findMockReturn = createSOFindResponse([
          createFindSO({
            connector: createESJiraConnector(),
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
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockReturnValue(
          Promise.resolve({
            saved_objects: [
              createCaseSavedObjectResponse({
                connector: createESJiraConnector(),
                externalService: createExternalService(),
              }),
              createCaseSavedObjectResponse({
                connector: createESJiraConnector({ id: '2' }),
                externalService: createExternalService({ connector_id: '200' }),
              }),
            ],
          })
        );

        const res = await service.getCases({ unsecuredSavedObjectsClient, caseIds: ['a'] });

        expect(res.saved_objects[0].attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(
          res.saved_objects[1].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"200"`);

        expect(res.saved_objects[1].attributes.connector.id).toMatchInlineSnapshot(`"2"`);
        expect(
          res.saved_objects[1].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"200"`);
      });
    });

    describe('get', () => {
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(
            createCaseSavedObjectResponse({
              connector: createESJiraConnector(),
              externalService: createExternalService(),
            })
          )
        );

        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(
            createCaseSavedObjectResponse({ externalService: createExternalService() })
          )
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

      it('sets external services connector_id to null when the connector id cannot be found in the references', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(createCaseSavedObjectResponse())
        );
        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`null`);
      });

      it('includes the external services fields when the connector id cannot be found in the references', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(createCaseSavedObjectResponse())
        );
        const res = await service.getCase({ unsecuredSavedObjectsClient, id: 'a' });

        expect(res.attributes.external_service).toMatchInlineSnapshot(`
          Object {
            "connector_id": null,
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

      it('defaults to the none connector and null external_services when attributes is undefined', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve(({
            references: [
              {
                id: '1',
                name: connectorIdReferenceName,
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

      it('returns a null external_services when it is already null', async () => {
        unsecuredSavedObjectsClient.get.mockReturnValue(
          Promise.resolve({
            attributes: { external_service: null },
          } as SavedObject<ESCaseAttributes>)
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
