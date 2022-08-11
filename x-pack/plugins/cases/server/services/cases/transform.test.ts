/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCaseSavedObjectResponse,
  createESJiraConnector,
  createExternalService,
  createJiraConnector,
} from '../test_utils';
import {
  transformAttributesToESModel,
  transformSavedObjectToExternalModel,
  transformUpdateResponseToExternalModel,
} from './transform';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { ConnectorTypes } from '../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';

describe('case transforms', () => {
  describe('transformUpdateResponseToExternalModel', () => {
    it('does not return the connector field if it is undefined', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {},
          references: undefined,
        }).attributes
      ).not.toHaveProperty('connector');
    });

    it('does not return the external_service field if it is undefined', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {},
          references: undefined,
        }).attributes
      ).not.toHaveProperty('external_service');
    });

    it('return a null external_service field if it is null', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: null,
          },
          references: undefined,
        }).attributes.external_service
      ).toBeNull();
    });

    it('return none external_service.connector_id field if it is none', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService({ connector_id: 'none' }),
          },
          references: undefined,
        }).attributes.external_service?.connector_id
      ).toBe('none');
    });

    it('return the external_service fields if it is populated', () => {
      const { connector_id: ignore, ...restExternalService } = createExternalService()!;
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: restExternalService,
          },
          references: undefined,
        }).attributes.external_service
      ).toMatchInlineSnapshot(`
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

    it('populates the connector_id field when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService(),
          },
          references: [
            { id: '1', name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.external_service?.connector_id
      ).toMatchInlineSnapshot(`"1"`);
    });

    it('populates the external_service fields when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService(),
          },
          references: [
            { id: '1', name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.external_service
      ).toMatchInlineSnapshot(`
        Object {
          "connector_id": "1",
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

    it('populates the connector fields when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            connector: {
              name: ConnectorTypes.jira,
              type: ConnectorTypes.jira,
              fields: [{ key: 'issueType', value: 'bug' }],
            },
          },
          references: [
            { id: '1', name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": Object {
            "issueType": "bug",
          },
          "id": "1",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('returns the none connector when it cannot find the reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            connector: {
              name: ConnectorTypes.jira,
              type: ConnectorTypes.jira,
              fields: [{ key: 'issueType', value: 'bug' }],
            },
          },
          references: undefined,
        }).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });
  });

  describe('transformAttributesToESModel', () => {
    it('does not return the external_service field when it is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: undefined,
        }).attributes
      ).not.toHaveProperty('external_service');
    });

    it('creates an undefined reference when external_service is undefined and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: undefined,
        }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns a null external_service when it is null', () => {
      expect(
        transformAttributesToESModel({
          external_service: null,
        }).attributes.external_service
      ).toBeNull();
    });

    it('creates an undefined reference when external_service is null and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: null,
        }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns the external_service fields except for the connector_id', () => {
      const transformedAttributes = transformAttributesToESModel({
        external_service: createExternalService(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
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
        }
      `);
      expect(transformedAttributes.attributes.external_service).not.toHaveProperty('connector_id');
      expect(transformedAttributes.referenceHandler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('creates an empty references array to delete the connector_id when connector_id is null and the original references is undefined', () => {
      const transformedAttributes = transformAttributesToESModel({
        external_service: createExternalService({ connector_id: 'none' }),
      });

      expect(transformedAttributes.referenceHandler.build()).toEqual([]);
    });

    it('does not return the connector when it is undefined', () => {
      expect(transformAttributesToESModel({ connector: undefined }).attributes).not.toHaveProperty(
        'connector'
      );
    });

    it('constructs an undefined reference when the connector is undefined and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({ connector: undefined }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns a jira connector', () => {
      const transformedAttributes = transformAttributesToESModel({
        connector: createJiraConnector(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
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
        }
      `);
      expect(transformedAttributes.attributes.connector).not.toHaveProperty('id');
      expect(transformedAttributes.referenceHandler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns a none connector without a reference', () => {
      const transformedAttributes = transformAttributesToESModel({
        connector: getNoneCaseConnector(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Array [],
            "name": "none",
            "type": ".none",
          },
        }
      `);
      expect(transformedAttributes.attributes.connector).not.toHaveProperty('id');
      expect(transformedAttributes.referenceHandler.build()).toEqual([]);
    });
  });

  describe('transformSavedObjectToExternalModel', () => {
    it('returns the default none connector when it cannot find the reference', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ connector: getNoneCaseConnector() })
        ).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('returns a jira connector', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ connector: createESJiraConnector() })
        ).attributes.connector
      ).toMatchInlineSnapshot(`
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

    it('sets external_service to null when it is null', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ externalService: null })
        ).attributes.external_service
      ).toBeNull();
    });

    it('sets external_service.connector_id to none when a reference cannot be found', () => {
      const transformedSO = transformSavedObjectToExternalModel(
        createCaseSavedObjectResponse({
          externalService: createExternalService({ connector_id: 'none' }),
        })
      );

      expect(transformedSO.attributes.external_service?.connector_id).toBe('none');
      expect(transformedSO.attributes.external_service).toMatchInlineSnapshot(`
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
  });
});
