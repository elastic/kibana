/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noneConnectorId } from '../../../common';
import { createExternalService, createJiraConnector } from '../../services/test_utils';
import { transformConnectorIdToReference, transformPushConnectorIdToReference } from './utils';

describe('migration utils', () => {
  describe('transformConnectorIdToReference', () => {
    it('returns the default none connector when the connector is undefined', () => {
      expect(transformConnectorIdToReference().transformedConnector).toMatchInlineSnapshot(`
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
      expect(transformConnectorIdToReference({ id: undefined }).transformedConnector)
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

    it('returns the default none connector when the id is none', () => {
      expect(transformConnectorIdToReference({ id: noneConnectorId }).transformedConnector)
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

    it('returns the default none connector when the id is none and other fields are defined', () => {
      expect(
        transformConnectorIdToReference({ ...createJiraConnector(), id: noneConnectorId })
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

    it('returns an empty array of references when the connector is undefined', () => {
      expect(transformConnectorIdToReference().references.length).toBe(0);
    });

    it('returns an empty array of references when the id is undefined', () => {
      expect(transformConnectorIdToReference({ id: undefined }).references.length).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector', () => {
      expect(transformConnectorIdToReference({ id: noneConnectorId }).references.length).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector and other fields are defined', () => {
      expect(
        transformConnectorIdToReference({ ...createJiraConnector(), id: noneConnectorId })
          .references.length
      ).toBe(0);
    });

    it('returns a jira connector', () => {
      const transformedFields = transformConnectorIdToReference(createJiraConnector());
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
  });

  describe('transformPushConnectorIdToReference', () => {
    it('sets external_service to null when it is undefined', () => {
      expect(transformPushConnectorIdToReference().transformedPushConnector).toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('sets external_service to null when it is null', () => {
      expect(transformPushConnectorIdToReference(null).transformedPushConnector)
        .toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference({ connector_id: undefined }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is null', () => {
      expect(transformPushConnectorIdToReference({ connector_id: null }).transformedPushConnector)
        .toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is none', () => {
      const otherFields = { otherField: 'hi' };

      expect(
        transformPushConnectorIdToReference({ ...otherFields, connector_id: noneConnectorId })
          .transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {
            "otherField": "hi",
          },
        }
      `);
    });

    it('returns an empty array of references when the external_service is undefined', () => {
      expect(transformPushConnectorIdToReference().references.length).toBe(0);
    });

    it('returns an empty array of references when the external_service is null', () => {
      expect(transformPushConnectorIdToReference(null).references.length).toBe(0);
    });

    it('returns an empty array of references when the connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference({ connector_id: undefined }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is null', () => {
      expect(
        transformPushConnectorIdToReference({ connector_id: undefined }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector', () => {
      expect(
        transformPushConnectorIdToReference({ connector_id: noneConnectorId }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector and other fields are defined', () => {
      expect(
        transformPushConnectorIdToReference({
          ...createExternalService(),
          connector_id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns the external_service connector', () => {
      const transformedFields = transformPushConnectorIdToReference(createExternalService());
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
  });
});
