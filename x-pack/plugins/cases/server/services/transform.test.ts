/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '../../../actions/server';
import { ConnectorTypes } from '../../common/api';
import { createESJiraConnector, createJiraConnector } from './test_utils';
import {
  findConnectorIdReference,
  transformESConnectorOrUseDefault,
  transformESConnectorToExternalModel,
  transformFieldsToESModel,
} from './transform';

describe('service transform helpers', () => {
  describe('findConnectorIdReference', () => {
    it('finds the reference when it exists', () => {
      expect(
        findConnectorIdReference('a', [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }])
      ).toBeDefined();
    });

    it('does not find the reference when the name is different', () => {
      expect(
        findConnectorIdReference('a', [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'b' }])
      ).toBeUndefined();
    });

    it('does not find the reference when references is empty', () => {
      expect(findConnectorIdReference('a', [])).toBeUndefined();
    });

    it('does not find the reference when references is undefined', () => {
      expect(findConnectorIdReference('a', undefined)).toBeUndefined();
    });

    it('does not find the reference when the type is different', () => {
      expect(
        findConnectorIdReference('a', [{ id: 'hello', type: 'yo', name: 'a' }])
      ).toBeUndefined();
    });
  });

  describe('transformESConnectorToExternalModel', () => {
    it('returns undefined when the connector is undefined', () => {
      expect(transformESConnectorToExternalModel({ referenceName: 'a' })).toBeUndefined();
    });

    it('returns the default connector when it cannot find the reference', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector(),
          referenceName: 'a',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('converts the connector.fields to an object', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector(),
          references: [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }],
          referenceName: 'a',
        })?.fields
      ).toMatchInlineSnapshot(`
        Object {
          "issueType": "bug",
          "parent": "2",
          "priority": "high",
        }
      `);
    });

    it('returns the full jira connector', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector(),
          references: [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }],
          referenceName: 'a',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "fields": Object {
            "issueType": "bug",
            "parent": "2",
            "priority": "high",
          },
          "id": "hello",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('sets fields to null if it is an empty array', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector({ fields: [] }),
          references: [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }],
          referenceName: 'a',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "hello",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('sets fields to null if it is null', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector({ fields: null }),
          references: [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }],
          referenceName: 'a',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "hello",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('sets fields to null if it is undefined', () => {
      expect(
        transformESConnectorToExternalModel({
          connector: createESJiraConnector({ fields: undefined }),
          references: [{ id: 'hello', type: ACTION_SAVED_OBJECT_TYPE, name: 'a' }],
          referenceName: 'a',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "hello",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });
  });

  describe('transformESConnectorOrUseDefault', () => {
    it('returns the default connector when the connector is undefined', () => {
      expect(transformESConnectorOrUseDefault({ referenceName: 'a' })).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });
  });

  describe('transformFieldsToESModel', () => {
    it('returns an empty array when fields is null', () => {
      expect(transformFieldsToESModel(createJiraConnector({ setFieldsToNull: true })).length).toBe(
        0
      );
    });

    it('returns an empty array when fields is an empty object', () => {
      expect(
        transformFieldsToESModel({
          id: '1',
          name: ConnectorTypes.jira,
          type: ConnectorTypes.jira,
          fields: {} as {
            issueType: string;
            priority: string;
            parent: string;
          },
        }).length
      ).toBe(0);
    });

    it('returns an array with the key/value pairs', () => {
      expect(transformFieldsToESModel(createJiraConnector())).toMatchInlineSnapshot(`
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
  });
});
