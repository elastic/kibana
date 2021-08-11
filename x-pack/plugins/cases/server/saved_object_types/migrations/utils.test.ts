/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noneConnectorId } from '../../../common';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common';
import { createExternalService, createJiraConnector } from '../../services/test_utils';
import { transformConnectorIdToReference, transformPushConnectorIdToReference } from './utils';

describe('migration utils', () => {
  describe('transformConnectorIdToReference', () => {
    it('returns the default none connector when the connector is undefined', () => {
      expect(transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME).transformedConnector)
        .toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is undefined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: undefined })
          .transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is none', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: noneConnectorId })
          .transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is none and other fields are defined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, {
          ...createJiraConnector(),
          id: noneConnectorId,
        }).transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns an empty array of references when the connector is undefined', () => {
      expect(transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME).references.length).toBe(
        0
      );
    });

    it('returns an empty array of references when the id is undefined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: undefined }).references
          .length
      ).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: noneConnectorId })
          .references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector and other fields are defined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, {
          ...createJiraConnector(),
          id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns a jira connector', () => {
      const transformedFields = transformConnectorIdToReference(
        CONNECTOR_ID_REFERENCE_NAME,
        createJiraConnector()
      );
      expect(transformedFields.transformedConnector).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          },
        }
      `);
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns a jira connector with the user action reference name', () => {
      const transformedFields = transformConnectorIdToReference(
        USER_ACTION_OLD_ID_REF_NAME,
        createJiraConnector()
      );
      expect(transformedFields.transformedConnector).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          },
        }
      `);
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "oldConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });

  describe('transformPushConnectorIdToReference', () => {
    it('sets external_service to null when it is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME)
          .transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('sets external_service to null when it is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, null)
          .transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: null,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is none', () => {
      const otherFields = { otherField: 'hi' };

      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          ...otherFields,
          connector_id: noneConnectorId,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {
            "otherField": "hi",
          },
        }
      `);
    });

    it('returns an empty array of references when the external_service is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the external_service is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, null).references
          .length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector and other fields are defined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          ...createExternalService(),
          connector_id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns the external_service connector', () => {
      const transformedFields = transformPushConnectorIdToReference(
        PUSH_CONNECTOR_ID_REFERENCE_NAME,
        createExternalService()
      );
      expect(transformedFields.transformedPushConnector).toMatchInlineSnapshot(`
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
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns the external_service connector with a user actions reference name', () => {
      const transformedFields = transformPushConnectorIdToReference(
        USER_ACTION_OLD_PUSH_ID_REF_NAME,
        createExternalService()
      );

      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "oldPushConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });
});
