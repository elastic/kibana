/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This test file references connector_id and connector.id. The connector_id is a field within the external_service
 * object. It holds the action connector's id that was used to push the case to the external service. The connector.id
 * field also holds an action connector's id. This id is the currently configured connector for the case. The next
 * time the case is pushed it will use this connector to push the case. The connector_id can be different from the
 * connector.id.
 */

import type { CaseAttributes, CaseConnector, CaseFullExternalService } from '../../../common/api';
import { CaseSeverity, CaseStatuses } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { CasesService } from '.';
import type { ESCaseConnectorWithId } from '../test_utils';
import {
  createESJiraConnector,
  createJiraConnector,
  createExternalService,
  createSavedObjectReferences,
  createCaseSavedObjectResponse,
  basicCaseFields,
  createSOFindResponse,
} from '../test_utils';
import type { ESCaseAttributes } from './types';
import { ESCaseSeverity, ESCaseStatus } from './types';
import { AttachmentService } from '../attachments';
import { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { CaseSavedObject } from '../../common/types';

const createUpdateSOResponse = ({
  connector,
  externalService,
  severity,
  status,
}: {
  connector?: ESCaseConnectorWithId;
  externalService?: CaseFullExternalService;
  severity?: ESCaseSeverity;
  status?: ESCaseStatus;
} = {}): SavedObjectsUpdateResponse<ESCaseAttributes> => {
  const references: SavedObjectReference[] = createSavedObjectReferences({
    connector,
    externalService,
  });

  let attributes: Partial<ESCaseAttributes> = { total_alerts: -1, total_comments: -1 };

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

  attributes = {
    ...attributes,
    ...((severity || severity === 0) && { severity }),
    ...((status || status === 0) && { status }),
  };

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
    overrides?: Partial<ESCaseAttributes>;
  } = {}
): SavedObjectsFindResult<ESCaseAttributes> => ({
  ...createCaseSavedObjectResponse(params),
  score: 0,
});

const createCaseUpdateParams = ({
  connector,
  externalService,
  severity,
  status,
}: {
  connector?: CaseConnector;
  externalService?: CaseFullExternalService;
  severity?: CaseSeverity;
  status?: CaseStatuses;
}): Partial<CaseAttributes> => ({
  ...(connector && { connector }),
  ...(externalService && { external_service: externalService }),
  ...(severity && { severity }),
  ...(status && { status }),
});

const createCasePostParams = ({
  connector,
  externalService,
  severity,
  status,
}: {
  connector: CaseConnector;
  externalService?: CaseFullExternalService;
  severity?: CaseSeverity;
  status?: CaseStatuses;
}): CaseAttributes => ({
  ...basicCaseFields,
  connector,
  ...(severity ? { severity } : { severity: basicCaseFields.severity }),
  ...(status ? { status } : { status: basicCaseFields.status }),
  ...(externalService ? { external_service: externalService } : { external_service: null }),
});

const createCasePatchParams = ({
  connector,
  externalService,
}: {
  connector?: CaseConnector;
  externalService?: CaseFullExternalService;
} = {}): Partial<CaseAttributes> => ({
  ...basicCaseFields,
  connector,
  ...(externalService && { external_service: externalService }),
});

describe('CasesService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const attachmentService = new AttachmentService(
    mockLogger,
    persistableStateAttachmentTypeRegistry
  );

  let service: CasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesService({
      log: mockLogger,
      unsecuredSavedObjectsClient,
      attachmentService,
    });
  });

  describe('transforms the external model to the Elasticsearch model', () => {
    describe('patch', () => {
      it('includes the passed in fields', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
            severity: CaseSeverity.CRITICAL,
            status: CaseStatuses['in-progress'],
          }),
          originalCase: {} as CaseSavedObject,
        });

        const {
          connector: ignoreConnector,
          external_service: ignoreExternalService,
          ...restUpdateAttributes
        } = unsecuredSavedObjectsClient.update.mock.calls[0][2] as Partial<ESCaseAttributes>;
        expect(restUpdateAttributes).toMatchInlineSnapshot(`
          Object {
            "assignees": Array [],
            "closed_at": null,
            "closed_by": null,
            "created_at": "2019-11-25T21:54:48.952Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "description": "This is a brand new case of a bad meanie defacing data",
            "duration": null,
            "owner": "securitySolution",
            "settings": Object {
              "syncAlerts": true,
            },
            "severity": 30,
            "status": 10,
            "tags": Array [
              "defacement",
            ],
            "title": "Super Bad Security Issue",
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
          }),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
          }),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({ connector: createJiraConnector() }),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: getNoneCaseConnector(),
            externalService: createExternalService(),
          }),
          originalCase: {} as CaseSavedObject,
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

      it('builds references for external service connector id, case connector id, and includes the existing references', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
          }),
          originalCase: {
            references: [{ id: 'a', name: 'awesome', type: 'hello' }],
          } as CaseSavedObject,
        });

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions<unknown>;
        expect(updateOptions.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "a",
              "name": "awesome",
              "type": "hello",
            },
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

      it('builds references for connector_id and preserves the existing connector.id reference', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePatchParams({ externalService: createExternalService() }),
          originalCase: {
            references: [
              { id: '1', name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
            ],
          } as CaseSavedObject,
        });

        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions<unknown>;
        expect(updateOptions.references).toMatchInlineSnapshot(`
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

      it('preserves the external_service fields except for the connector_id', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCasePostParams({
            connector: getNoneCaseConnector(),
            externalService: createExternalService(),
          }),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(
          `Object {}`
        );
        const updateOptions = unsecuredSavedObjectsClient.update.mock
          .calls[0][3] as SavedObjectsUpdateOptions<unknown>;
        expect(updateOptions.references).toBeUndefined();
      });

      it('creates a updatedAttributes field with the none connector', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({ connector: getNoneCaseConnector() }),
          originalCase: {} as CaseSavedObject,
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

      it.each([
        [CaseSeverity.LOW, ESCaseSeverity.LOW],
        [CaseSeverity.MEDIUM, ESCaseSeverity.MEDIUM],
        [CaseSeverity.HIGH, ESCaseSeverity.HIGH],
        [CaseSeverity.CRITICAL, ESCaseSeverity.CRITICAL],
      ])(
        'properly converts "%s" severity to corresponding ES value on updating SO',
        async (patchParamsSeverity, expectedSeverity) => {
          unsecuredSavedObjectsClient.update.mockResolvedValue(
            {} as SavedObjectsUpdateResponse<ESCaseAttributes>
          );

          await service.patchCase({
            caseId: '1',
            updatedAttributes: createCaseUpdateParams({ severity: patchParamsSeverity }),
            originalCase: {} as CaseSavedObject,
          });

          const patchAttributes = unsecuredSavedObjectsClient.update.mock
            .calls[0][2] as ESCaseAttributes;

          expect(patchAttributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [CaseStatuses.open, ESCaseStatus.OPEN],
        [CaseStatuses['in-progress'], ESCaseStatus.IN_PROGRESS],
        [CaseStatuses.closed, ESCaseStatus.CLOSED],
      ])(
        'properly converts "%s" status to corresponding ES value on updating SO',
        async (patchParamsStatus, expectedStatus) => {
          unsecuredSavedObjectsClient.update.mockResolvedValue(
            {} as SavedObjectsUpdateResponse<ESCaseAttributes>
          );

          await service.patchCase({
            caseId: '1',
            updatedAttributes: createCaseUpdateParams({ status: patchParamsStatus }),
            originalCase: {} as CaseSavedObject,
          });

          const patchAttributes = unsecuredSavedObjectsClient.update.mock
            .calls[0][2] as ESCaseAttributes;

          expect(patchAttributes.status).toEqual(expectedStatus);
        }
      );
    });

    describe('bulkPatch', () => {
      it('properly converts severity to corresponding ES value on bulk updating SO', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({ caseId: '1' }),
            createCaseSavedObjectResponse({ caseId: '2' }),
            createCaseSavedObjectResponse({ caseId: '3' }),
            createCaseSavedObjectResponse({ caseId: '4' }),
          ],
        });

        await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                severity: CaseSeverity.LOW,
              }),
              originalCase: {} as CaseSavedObject,
            },
            {
              caseId: '2',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                severity: CaseSeverity.MEDIUM,
              }),
              originalCase: {} as CaseSavedObject,
            },
            {
              caseId: '3',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                severity: CaseSeverity.HIGH,
              }),
              originalCase: {} as CaseSavedObject,
            },
            {
              caseId: '4',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                severity: CaseSeverity.CRITICAL,
              }),
              originalCase: {} as CaseSavedObject,
            },
          ],
        });

        const patchResults = unsecuredSavedObjectsClient.bulkUpdate.mock
          .calls[0][0] as unknown as Array<SavedObject<ESCaseAttributes>>;

        expect(patchResults[0].attributes.severity).toEqual(ESCaseSeverity.LOW);
        expect(patchResults[1].attributes.severity).toEqual(ESCaseSeverity.MEDIUM);
        expect(patchResults[2].attributes.severity).toEqual(ESCaseSeverity.HIGH);
        expect(patchResults[3].attributes.severity).toEqual(ESCaseSeverity.CRITICAL);
      });

      it('properly converts status to corresponding ES value on bulk updating SO', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({ caseId: '1' }),
            createCaseSavedObjectResponse({ caseId: '2' }),
            createCaseSavedObjectResponse({ caseId: '3' }),
          ],
        });

        await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                status: CaseStatuses.open,
              }),
              originalCase: {} as CaseSavedObject,
            },
            {
              caseId: '2',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                status: CaseStatuses['in-progress'],
              }),
              originalCase: {} as CaseSavedObject,
            },
            {
              caseId: '3',
              updatedAttributes: createCasePostParams({
                connector: getNoneCaseConnector(),
                status: CaseStatuses.closed,
              }),
              originalCase: {} as CaseSavedObject,
            },
          ],
        });

        const patchResults = unsecuredSavedObjectsClient.bulkUpdate.mock
          .calls[0][0] as unknown as Array<SavedObject<ESCaseAttributes>>;

        expect(patchResults[0].attributes.status).toEqual(ESCaseStatus.OPEN);
        expect(patchResults[1].attributes.status).toEqual(ESCaseStatus.IN_PROGRESS);
        expect(patchResults[2].attributes.status).toEqual(ESCaseStatus.CLOSED);
      });
    });

    describe('post', () => {
      it('creates a null external_service field when the attribute was null in the creation parameters', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({ connector: createJiraConnector() }),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
        expect(postAttributes.external_service).toMatchInlineSnapshot(`null`);
      });

      it('includes the creation attributes excluding the connector.id and connector_id', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
          }),
          id: '1',
        });

        const creationAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as ESCaseAttributes;
        expect(creationAttributes.connector).not.toHaveProperty('id');
        expect(creationAttributes.external_service).not.toHaveProperty('connector_id');
        expect(creationAttributes).toMatchInlineSnapshot(`
          Object {
            "assignees": Array [],
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
            "duration": null,
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
            "severity": 0,
            "status": 0,
            "tags": Array [
              "defacement",
            ],
            "title": "Super Bad Security Issue",
            "total_alerts": -1,
            "total_comments": -1,
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
            "refresh": undefined,
          }
        `);
      });

      it('includes default values for total_alerts and total_comments', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({
            connector: getNoneCaseConnector(),
          }),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as ESCaseAttributes;

        expect(postAttributes.total_alerts).toEqual(-1);
        expect(postAttributes.total_comments).toEqual(-1);
      });

      it('moves the connector.id and connector_id to the references', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({
            connector: createJiraConnector(),
            externalService: createExternalService(),
          }),
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
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({
            connector: createJiraConnector({ setFieldsToNull: true }),
            externalService: createExternalService(),
          }),
          id: '1',
        });

        const postAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as CaseAttributes;
        expect(postAttributes.connector.fields).toEqual([]);
      });

      it('does not create a reference for a none connector', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toEqual([]);
      });

      it('does not create a reference for an external_service field that is null', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

        await service.postNewCase({
          attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
          id: '1',
        });

        const creationOptions = unsecuredSavedObjectsClient.create.mock
          .calls[0][2] as SavedObjectsCreateOptions;
        expect(creationOptions.references).toEqual([]);
      });

      it.each([
        [CaseSeverity.LOW, ESCaseSeverity.LOW],
        [CaseSeverity.MEDIUM, ESCaseSeverity.MEDIUM],
        [CaseSeverity.HIGH, ESCaseSeverity.HIGH],
        [CaseSeverity.CRITICAL, ESCaseSeverity.CRITICAL],
      ])(
        'properly converts "%s" severity to corresponding ES value on creating SO',
        async (postParamsSeverity, expectedSeverity) => {
          unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

          await service.postNewCase({
            attributes: createCasePostParams({
              connector: getNoneCaseConnector(),
              severity: postParamsSeverity,
            }),
            id: '1',
          });

          const postAttributes = unsecuredSavedObjectsClient.create.mock
            .calls[0][1] as ESCaseAttributes;
          expect(postAttributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [CaseStatuses.open, ESCaseStatus.OPEN],
        [CaseStatuses['in-progress'], ESCaseStatus.IN_PROGRESS],
        [CaseStatuses.closed, ESCaseStatus.CLOSED],
      ])(
        'properly converts "%s" status to corresponding ES value on creating SO',
        async (postParamsStatus, expectedStatus) => {
          unsecuredSavedObjectsClient.create.mockResolvedValue({} as SavedObject<ESCaseAttributes>);

          await service.postNewCase({
            attributes: createCasePostParams({
              connector: getNoneCaseConnector(),
              status: postParamsStatus,
            }),
            id: '1',
          });

          const postAttributes = unsecuredSavedObjectsClient.create.mock
            .calls[0][1] as ESCaseAttributes;
          expect(postAttributes.status).toEqual(expectedStatus);
        }
      );
    });
  });

  describe('transforms the Elasticsearch model to the external model', () => {
    describe('bulkPatch', () => {
      it('formats the update saved object by including the passed in fields and transforming the connector.fields', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
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
        });

        const res = await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({
                connector: createJiraConnector(),
                externalService: createExternalService(),
              }),
              originalCase: {} as CaseSavedObject,
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

      it('properly converts the severity field to the corresponding external value in the bulkPatch response', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({ overrides: { severity: ESCaseSeverity.LOW } }),
            createCaseSavedObjectResponse({ overrides: { severity: ESCaseSeverity.MEDIUM } }),
            createCaseSavedObjectResponse({ overrides: { severity: ESCaseSeverity.HIGH } }),
            createCaseSavedObjectResponse({ overrides: { severity: ESCaseSeverity.CRITICAL } }),
          ],
        });

        const res = await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({ connector: getNoneCaseConnector() }),
              originalCase: {} as CaseSavedObject,
            },
          ],
        });
        expect(res.saved_objects[0].attributes.severity).toEqual(CaseSeverity.LOW);
        expect(res.saved_objects[1].attributes.severity).toEqual(CaseSeverity.MEDIUM);
        expect(res.saved_objects[2].attributes.severity).toEqual(CaseSeverity.HIGH);
        expect(res.saved_objects[3].attributes.severity).toEqual(CaseSeverity.CRITICAL);
      });

      it('properly converts the status field to the corresponding external value in the bulkPatch response', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({ overrides: { status: ESCaseStatus.OPEN } }),
            createCaseSavedObjectResponse({ overrides: { status: ESCaseStatus.IN_PROGRESS } }),
            createCaseSavedObjectResponse({ overrides: { status: ESCaseStatus.CLOSED } }),
          ],
        });

        const res = await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({ connector: getNoneCaseConnector() }),
              originalCase: {} as CaseSavedObject,
            },
          ],
        });
        expect(res.saved_objects[0].attributes.status).toEqual(CaseStatuses.open);
        expect(res.saved_objects[1].attributes.status).toEqual(CaseStatuses['in-progress']);
        expect(res.saved_objects[2].attributes.status).toEqual(CaseStatuses.closed);
      });

      it('does not include total_alerts and total_comments fields in the response', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({}),
            createCaseSavedObjectResponse({}),
            createCaseSavedObjectResponse({}),
          ],
        });

        const res = await service.patchCases({
          cases: [
            {
              caseId: '1',
              updatedAttributes: createCasePostParams({ connector: getNoneCaseConnector() }),
              originalCase: {} as CaseSavedObject,
            },
          ],
        });

        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_comments');
        expect(res.saved_objects[1].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[1].attributes).not.toHaveProperty('total_comments');
        expect(res.saved_objects[2].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[2].attributes).not.toHaveProperty('total_comments');
      });
    });

    describe('patch', () => {
      it('returns an object with a none connector and without a reference when it was set to a none connector in the update', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          createUpdateSOResponse({ connector: getNoneCaseConnector() })
        );

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          createUpdateSOResponse({ externalService: null })
        );

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(res.attributes).toMatchInlineSnapshot(`
            Object {
              "external_service": null,
            }
          `);
        expect(res.references).toMatchInlineSnapshot(`Array []`);
      });

      it('returns an empty object when neither the connector or external service was updated', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUpdateSOResponse());

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(res.attributes).toMatchInlineSnapshot(`Object {}`);
        expect(res.references).toMatchInlineSnapshot(`Array []`);
      });

      it('returns an undefined connector if it is not returned by the update', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          {} as SavedObjectsUpdateResponse<ESCaseAttributes>
        );

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
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

        unsecuredSavedObjectsClient.update.mockResolvedValue(returnValue);

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
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

      it('returns none external service connector when it cannot find the reference', async () => {
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

        unsecuredSavedObjectsClient.update.mockResolvedValue(returnValue);

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(res.attributes.external_service?.connector_id).toBe('none');
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

        unsecuredSavedObjectsClient.update.mockResolvedValue(returnValue);

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(res).toMatchInlineSnapshot(`
          Object {
            "attributes": Object {
              "external_service": Object {
                "connector_id": "none",
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          createUpdateSOResponse({ connector: createESJiraConnector() })
        );

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
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
        unsecuredSavedObjectsClient.update.mockResolvedValue(
          createUpdateSOResponse({ externalService: createExternalService() })
        );

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
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

      it.each([
        [ESCaseSeverity.LOW, CaseSeverity.LOW],
        [ESCaseSeverity.MEDIUM, CaseSeverity.MEDIUM],
        [ESCaseSeverity.HIGH, CaseSeverity.HIGH],
        [ESCaseSeverity.CRITICAL, CaseSeverity.CRITICAL],
      ])(
        'properly converts "%s" severity to corresponding external value in the patch response',
        async (internalSeverityValue, expectedSeverity) => {
          unsecuredSavedObjectsClient.update.mockResolvedValue(
            createUpdateSOResponse({ severity: internalSeverityValue })
          );

          const res = await service.patchCase({
            caseId: '1',
            updatedAttributes: createCaseUpdateParams({}),
            originalCase: {} as CaseSavedObject,
          });

          expect(res.attributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [ESCaseStatus.OPEN, CaseStatuses.open],
        [ESCaseStatus.IN_PROGRESS, CaseStatuses['in-progress']],
        [ESCaseStatus.CLOSED, CaseStatuses.closed],
      ])(
        'properly converts "%s" status to corresponding external value in the patch response',
        async (internalStatusValue, expectedStatus) => {
          unsecuredSavedObjectsClient.update.mockResolvedValue(
            createUpdateSOResponse({ status: internalStatusValue })
          );

          const res = await service.patchCase({
            caseId: '1',
            updatedAttributes: createCaseUpdateParams({}),
            originalCase: {} as CaseSavedObject,
          });

          expect(res.attributes.status).toEqual(expectedStatus);
        }
      );

      it('does not include total_alerts and total_comments fields in the response', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUpdateSOResponse({}));

        const res = await service.patchCase({
          caseId: '1',
          updatedAttributes: createCaseUpdateParams({}),
          originalCase: {} as CaseSavedObject,
        });

        expect(res.attributes).not.toHaveProperty('total_alerts');
        expect(res.attributes).not.toHaveProperty('total_comments');
      });
    });

    describe('post', () => {
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(
          createCaseSavedObjectResponse({
            connector: createESJiraConnector(),
            externalService: createExternalService(),
          })
        );

        const res = await service.postNewCase({
          attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
          id: '1',
        });

        expect(res.attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });

      it.each([
        [ESCaseSeverity.LOW, CaseSeverity.LOW],
        [ESCaseSeverity.MEDIUM, CaseSeverity.MEDIUM],
        [ESCaseSeverity.HIGH, CaseSeverity.HIGH],
        [ESCaseSeverity.CRITICAL, CaseSeverity.CRITICAL],
      ])(
        'properly converts "%s" severity to corresponding external value in the post response',
        async (internalSeverityValue, expectedSeverity) => {
          unsecuredSavedObjectsClient.create.mockResolvedValue(
            createCaseSavedObjectResponse({ overrides: { severity: internalSeverityValue } })
          );

          const res = await service.postNewCase({
            attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
            id: '1',
          });

          expect(res.attributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [ESCaseStatus.OPEN, CaseStatuses.open],
        [ESCaseStatus.IN_PROGRESS, CaseStatuses['in-progress']],
        [ESCaseStatus.CLOSED, CaseStatuses.closed],
      ])(
        'properly converts "%s" status to corresponding external value in the post response',
        async (internalStatusValue, expectedStatus) => {
          unsecuredSavedObjectsClient.create.mockResolvedValue(
            createCaseSavedObjectResponse({ overrides: { status: internalStatusValue } })
          );

          const res = await service.postNewCase({
            attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
            id: '1',
          });

          expect(res.attributes.status).toEqual(expectedStatus);
        }
      );

      it('does not include total_alerts and total_comments fields in the response', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createCaseSavedObjectResponse({}));

        const res = await service.postNewCase({
          attributes: createCasePostParams({ connector: getNoneCaseConnector() }),
          id: '1',
        });

        expect(res.attributes).not.toHaveProperty('total_alerts');
        expect(res.attributes).not.toHaveProperty('total_comments');
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
        unsecuredSavedObjectsClient.find.mockResolvedValue(findMockReturn);

        const res = await service.findCases();
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
        unsecuredSavedObjectsClient.find.mockResolvedValue(findMockReturn);

        const res = await service.findCases();
        const { saved_objects: ignored, ...findResponseFields } = res;
        expect(findResponseFields).toMatchInlineSnapshot(`
          Object {
            "page": 1,
            "per_page": 2,
            "total": 2,
          }
        `);
      });

      it.each([
        [ESCaseSeverity.LOW, CaseSeverity.LOW],
        [ESCaseSeverity.MEDIUM, CaseSeverity.MEDIUM],
        [ESCaseSeverity.HIGH, CaseSeverity.HIGH],
        [ESCaseSeverity.CRITICAL, CaseSeverity.CRITICAL],
      ])(
        'includes the properly converted "%s" severity field in the result',
        async (severity, expectedSeverity) => {
          const findMockReturn = createSOFindResponse([
            createFindSO({ overrides: { severity } }),
            createFindSO(),
          ]);
          unsecuredSavedObjectsClient.find.mockResolvedValue(findMockReturn);

          const res = await service.findCases();
          expect(res.saved_objects[0].attributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [ESCaseStatus.OPEN, CaseStatuses.open],
        [ESCaseStatus.IN_PROGRESS, CaseStatuses['in-progress']],
        [ESCaseStatus.CLOSED, CaseStatuses.closed],
      ])(
        'includes the properly converted "%s" status field in the result',
        async (status, expectedStatus) => {
          const findMockReturn = createSOFindResponse([
            createFindSO({ overrides: { status } }),
            createFindSO(),
          ]);
          unsecuredSavedObjectsClient.find.mockResolvedValue(findMockReturn);

          const res = await service.findCases();
          expect(res.saved_objects[0].attributes.status).toEqual(expectedStatus);
        }
      );

      it('does not include total_alerts and total_comments fields in the response', async () => {
        const findMockReturn = createSOFindResponse([createFindSO(), createFindSO()]);
        unsecuredSavedObjectsClient.find.mockResolvedValue(findMockReturn);

        const res = await service.findCases();

        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_comments');
      });
    });

    describe('bulkGet', () => {
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
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
        });

        const res = await service.getCases({ caseIds: ['a'] });

        expect(res.saved_objects[0].attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(
          res.saved_objects[1].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"200"`);

        expect(res.saved_objects[1].attributes.connector.id).toMatchInlineSnapshot(`"2"`);
        expect(
          res.saved_objects[1].attributes.external_service?.connector_id
        ).toMatchInlineSnapshot(`"200"`);
      });

      it('includes all severity values properly converted in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({
              overrides: { severity: ESCaseSeverity.LOW },
            }),
            createCaseSavedObjectResponse({
              overrides: { severity: ESCaseSeverity.MEDIUM },
            }),
            createCaseSavedObjectResponse({
              overrides: { severity: ESCaseSeverity.HIGH },
            }),
            createCaseSavedObjectResponse({
              overrides: { severity: ESCaseSeverity.CRITICAL },
            }),
          ],
        });

        const res = await service.getCases({ caseIds: ['a'] });
        expect(res.saved_objects[0].attributes.severity).toEqual(CaseSeverity.LOW);
        expect(res.saved_objects[1].attributes.severity).toEqual(CaseSeverity.MEDIUM);
        expect(res.saved_objects[2].attributes.severity).toEqual(CaseSeverity.HIGH);
        expect(res.saved_objects[3].attributes.severity).toEqual(CaseSeverity.CRITICAL);
      });

      it('includes all status values properly converted in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({
              overrides: { status: ESCaseStatus.OPEN },
            }),
            createCaseSavedObjectResponse({
              overrides: { status: ESCaseStatus.IN_PROGRESS },
            }),
            createCaseSavedObjectResponse({
              overrides: { status: ESCaseStatus.CLOSED },
            }),
          ],
        });

        const res = await service.getCases({ caseIds: ['a'] });
        expect(res.saved_objects[0].attributes.status).toEqual(CaseStatuses.open);
        expect(res.saved_objects[1].attributes.status).toEqual(CaseStatuses['in-progress']);
        expect(res.saved_objects[2].attributes.status).toEqual(CaseStatuses.closed);
      });

      it('does not include total_alerts and total_comments fields in the response', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [
            createCaseSavedObjectResponse({}),
            createCaseSavedObjectResponse({}),
            createCaseSavedObjectResponse({}),
          ],
        });

        const res = await service.getCases({ caseIds: ['a'] });
        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[0].attributes).not.toHaveProperty('total_comments');
        expect(res.saved_objects[1].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[1].attributes).not.toHaveProperty('total_comments');
        expect(res.saved_objects[2].attributes).not.toHaveProperty('total_alerts');
        expect(res.saved_objects[2].attributes).not.toHaveProperty('total_comments');
      });
    });

    describe('get', () => {
      it('includes the connector.id and connector_id fields in the response', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue(
          createCaseSavedObjectResponse({
            connector: createESJiraConnector(),
            externalService: createExternalService(),
          })
        );

        const res = await service.getCase({ id: 'a' });

        expect(res.attributes.connector.id).toMatchInlineSnapshot(`"1"`);
        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"100"`);
      });

      it('defaults to the none connector when the connector reference cannot be found', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue(
          createCaseSavedObjectResponse({ externalService: createExternalService() })
        );
        const res = await service.getCase({ id: 'a' });

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
        unsecuredSavedObjectsClient.get.mockResolvedValue(createCaseSavedObjectResponse());
        const res = await service.getCase({ id: 'a' });

        expect(res.attributes.external_service?.connector_id).toMatchInlineSnapshot(`"none"`);
      });

      it('includes the external services fields when the connector id cannot be found in the references', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue(createCaseSavedObjectResponse());
        const res = await service.getCase({ id: 'a' });

        expect(res.attributes.external_service).toMatchInlineSnapshot(`
          Object {
            "connector_id": "none",
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
        unsecuredSavedObjectsClient.get.mockResolvedValue({
          references: [
            {
              id: '1',
              name: CONNECTOR_ID_REFERENCE_NAME,
              type: ACTION_SAVED_OBJECT_TYPE,
            },
          ],
        } as unknown as SavedObject<ESCaseAttributes>);
        const res = await service.getCase({ id: 'a' });

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
        unsecuredSavedObjectsClient.get.mockResolvedValue({
          attributes: { external_service: null },
        } as SavedObject<ESCaseAttributes>);
        const res = await service.getCase({ id: 'a' });

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

      it.each([
        [ESCaseSeverity.LOW, CaseSeverity.LOW],
        [ESCaseSeverity.MEDIUM, CaseSeverity.MEDIUM],
        [ESCaseSeverity.HIGH, CaseSeverity.HIGH],
        [ESCaseSeverity.CRITICAL, CaseSeverity.CRITICAL],
      ])(
        'includes the properly converted "%s" severity field in the result',
        async (internalSeverityValue, expectedSeverity) => {
          unsecuredSavedObjectsClient.get.mockResolvedValue({
            attributes: { severity: internalSeverityValue },
          } as SavedObject<ESCaseAttributes>);

          const res = await service.getCase({ id: 'a' });

          expect(res.attributes.severity).toEqual(expectedSeverity);
        }
      );

      it.each([
        [ESCaseStatus.OPEN, CaseStatuses.open],
        [ESCaseStatus.IN_PROGRESS, CaseStatuses['in-progress']],
        [ESCaseStatus.CLOSED, CaseStatuses.closed],
      ])(
        'includes the properly converted "%s" status field in the result',
        async (internalStatusValue, expectedStatus) => {
          unsecuredSavedObjectsClient.get.mockResolvedValue({
            attributes: { status: internalStatusValue },
          } as SavedObject<ESCaseAttributes>);

          const res = await service.getCase({ id: 'a' });

          expect(res.attributes.status).toEqual(expectedStatus);
        }
      );

      it('does not include total_alerts and total_comments fields in the response', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue({
          attributes: {
            total_alerts: -1,
            total_comments: -1,
          },
        } as unknown as SavedObject<ESCaseAttributes>);

        const res = await service.getCase({ id: 'a' });
        expect(res.attributes).not.toHaveProperty('total_alerts');
        expect(res.attributes).not.toHaveProperty('total_comments');
      });
    });
  });

  describe('executeAggregations', () => {
    const aggregationBuilders = [
      {
        build: () => ({
          myAggregation: { avg: { field: 'avg-field' } },
        }),
        getName: () => 'avg-test-builder',
        formatResponse: () => {},
      },
      {
        build: () => ({
          myAggregation: { min: { field: 'min-field' } },
        }),
        getName: () => 'min-test-builder',
        formatResponse: () => {},
      },
    ];

    it('returns an aggregation correctly', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
        aggregations: { myAggregation: { value: 0 } },
      } as SavedObjectsFindResponse<ESCaseAttributes>);

      const res = await service.executeAggregations({ aggregationBuilders });
      expect(res).toEqual({ myAggregation: { value: 0 } });
    });

    it('calls find correctly', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
        aggregations: { myAggregation: { value: 0 } },
      } as SavedObjectsFindResponse<ESCaseAttributes>);

      await service.executeAggregations({ aggregationBuilders, options: { perPage: 20 } });
      expect(unsecuredSavedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "myAggregation": Object {
              "min": Object {
                "field": "min-field",
              },
            },
          },
          "perPage": 20,
          "sortField": "created_at",
          "type": "cases",
        }
      `);
    });

    it('throws an error correctly', async () => {
      expect.assertions(1);
      unsecuredSavedObjectsClient.find.mockRejectedValue(new Error('Aggregation error'));

      await expect(service.executeAggregations({ aggregationBuilders })).rejects.toThrow(
        'Failed to execute aggregations [avg-test-builder,min-test-builder]: Error: Aggregation error'
      );
    });
  });
});
