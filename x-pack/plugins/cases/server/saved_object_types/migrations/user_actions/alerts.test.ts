/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
} from '@kbn/core/server';
import { cloneDeep, omit, set } from 'lodash';
import { migrationMocks } from '@kbn/core/server/mocks';
import { removeRuleInformation } from './alerts';

describe('alert user actions', () => {
  describe('removeRuleInformation', () => {
    let context: jest.Mocked<SavedObjectMigrationContext>;

    beforeEach(() => {
      context = migrationMocks.createContext();
    });

    describe('JSON.stringify throws an error', () => {
      let jsonStringifySpy: jest.SpyInstance;
      beforeEach(() => {
        jsonStringifySpy = jest.spyOn(JSON, 'stringify').mockImplementation(() => {
          throw new Error('failed to stringify');
        });
      });

      afterEach(() => {
        jsonStringifySpy.mockRestore();
      });

      it('logs an error when an error is thrown outside of the JSON.parse function', () => {
        const doc = {
          id: '123',
          attributes: {
            action: 'create',
            action_field: ['comment'],
            new_value:
              '{"type":"generated_alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
          },
          type: 'abc',
          references: [],
        };

        expect(removeRuleInformation(doc, context)).toEqual(doc);

        const log = context.log as jest.Mocked<SavedObjectsMigrationLogger>;
        expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "Failed to migrate user action alerts with doc id: 123 version: 8.0.0 error: failed to stringify",
            Object {
              "migrations": Object {
                "userAction": Object {
                  "id": "123",
                },
              },
            },
          ]
        `);
      });
    });

    describe('JSON.parse spy', () => {
      let jsonParseSpy: jest.SpyInstance;
      beforeEach(() => {
        jsonParseSpy = jest.spyOn(JSON, 'parse');
      });

      afterEach(() => {
        jsonParseSpy.mockRestore();
      });

      it.each([
        ['update', ['status']],
        ['update', ['comment']],
        [undefined, ['comment']],
        ['create', ['status']],
        ['create', []],
      ])(
        'does not modify the document and does not call JSON.parse when action: %s and action_field: %s',
        (action, actionField) => {
          const doc = {
            id: '123',
            attributes: {
              action,
              action_field: actionField,
              new_value: 'open',
            },
            type: 'abc',
            references: [],
          };

          expect(removeRuleInformation(doc, context)).toEqual(doc);

          expect(jsonParseSpy).not.toBeCalled();

          const log = context.log as jest.Mocked<SavedObjectsMigrationLogger>;
          expect(log.error).not.toBeCalled();
        }
      );
    });

    it('does not modify non-alert user action', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['description'],
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc, context)).toEqual(doc);
    });

    it('does not modify the document when it fails to decode the new_value field', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value: '{"type":"alert",',
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc, context)).toEqual(doc);

      const log = context.log as jest.Mocked<SavedObjectsMigrationLogger>;
      expect(log.error).not.toBeCalled();
    });

    it('does not modify the document when new_value is null', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value: null,
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc, context)).toEqual(doc);
    });

    it('does not modify the document when new_value is undefined', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc, context)).toEqual(doc);
    });

    it('does not modify the document when the comment type is not an alert', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value:
            '{"type":"not_an_alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc, context)).toEqual(doc);
    });

    it('sets the rule fields to null', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value:
            '{"type":"alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
        },
        type: 'abc',
        references: [],
      };

      const newDoc = removeRuleInformation(doc, context) as SavedObject<{ new_value: string }>;
      ensureRuleFieldsAreNull(newDoc);

      expect(docWithoutNewValue(newDoc)).toEqual(docWithoutNewValue(doc));
      expectParsedDocsToEqual(newDoc, doc);
    });

    it('sets the rule fields to null when the alert has an extra field', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value:
            '{"anExtraField": "some value","type":"alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
        },
        type: 'abc',
        references: [],
      };

      const newDoc = removeRuleInformation(doc, context) as SavedObject<{ new_value: string }>;
      ensureRuleFieldsAreNull(newDoc);

      expect(docWithoutNewValue(newDoc)).toEqual(docWithoutNewValue(doc));
      expectParsedDocsToEqual(newDoc, doc);
    });

    it('sets the rule fields to null for a generated alert', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value:
            '{"type":"generated_alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
        },
        type: 'abc',
        references: [],
      };

      const newDoc = removeRuleInformation(doc, context) as SavedObject<{ new_value: string }>;
      ensureRuleFieldsAreNull(newDoc);

      expect(docWithoutNewValue(newDoc)).toEqual(docWithoutNewValue(doc));
      expectParsedDocsToEqual(newDoc, doc);
    });

    it('preserves the references field', () => {
      const doc = {
        id: '123',
        attributes: {
          action: 'create',
          action_field: ['comment'],
          new_value:
            '{"type":"generated_alert","alertId":"4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb","index":".internal.alerts-security.alerts-default-000001","rule":{"id":"43104810-7875-11ec-abc6-6f72e72f6004","name":"A rule"},"owner":"securitySolution"}',
        },
        type: 'abc',
        references: [{ id: '123', name: 'hi', type: 'awesome' }],
      };

      const newDoc = removeRuleInformation(doc, context) as SavedObject<{ new_value: string }>;
      ensureRuleFieldsAreNull(newDoc);

      expect(docWithoutNewValue(newDoc)).toEqual(docWithoutNewValue(doc));
      expectParsedDocsToEqual(newDoc, doc);
    });
  });
});

const expectParsedDocsToEqual = (
  nulledRuleDoc: SavedObject<{ new_value: string }>,
  originalDoc: SavedObject<{ new_value: string }>
) => {
  expect(parseDoc(nulledRuleDoc)).toEqual(injectNullRuleFields(parseDoc(originalDoc)));
};

const parseDoc = (doc: SavedObject<{ new_value: string }>): SavedObject<{ new_value: {} }> => {
  const copyOfDoc = cloneDeep(doc);

  const decodedNewValue = JSON.parse(doc.attributes.new_value);
  set(copyOfDoc, 'attributes.new_value', decodedNewValue);

  return copyOfDoc;
};

const injectNullRuleFields = (doc: SavedObject<{ new_value: {} }>) => {
  const copyOfDoc = cloneDeep(doc);

  set(copyOfDoc, 'attributes.new_value', {
    ...doc.attributes.new_value,
    rule: { id: null, name: null },
  });

  return copyOfDoc;
};

const docWithoutNewValue = (doc: {}) => {
  const copyOfDoc = cloneDeep(doc);
  return omit(copyOfDoc, 'attributes.new_value');
};

const ensureRuleFieldsAreNull = (doc: SavedObject<{ new_value: string }>) => {
  const decodedNewValue = JSON.parse(doc.attributes.new_value);

  expect(decodedNewValue.rule).toEqual({ id: null, name: null });
};
