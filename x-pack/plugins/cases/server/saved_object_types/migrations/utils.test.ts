/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noneConnectorId } from '../../../common';
import { createJiraConnector } from '../../services/test_utils';
import { transformConnectorIdToReference } from './utils';

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
});
