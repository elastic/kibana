/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { FieldMigrator } from './migrator';

describe('FieldMigrator', () => {
  describe('extractFieldsToReferences', () => {
    it('migrates the hello field to references and removes it from the transformed result', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({ data: { hello: '1', awesome: '2' } });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([{ id: '1', name: 'name', type: 'type' }]);
    });

    it('ignores a field that does not exist and returns an empty references result', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({ data: { awesome: '2' } });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([]);
    });

    it('ignores a field that does not exist and preserves the original references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: { awesome: '2' },
        existingReferences: [{ id: '1', name: 'awesome', type: 'someType' }],
      });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([{ id: '1', name: 'awesome', type: 'someType' }]);
    });

    it('migrates multiple fields', () => {
      const migrator = new FieldMigrator([
        { path: 'hello', type: 'type', name: 'name' },
        { path: 'a', type: 'aType', name: 'aName' },
      ]);

      const result = migrator.extractFieldsToReferences({
        data: { hello: '1', awesome: '2', a: 'aId' },
      });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([
        { id: '1', name: 'name', type: 'type' },
        { id: 'aId', name: 'aName', type: 'aType' },
      ]);
    });

    it('migrates a nested field', () => {
      const migrator = new FieldMigrator([{ path: 'a.hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: {
          outerHello: '1',
          awesome: '2',
          a: { hello: '1' },
        },
      });

      expect(result.transformedFields).toEqual({
        outerHello: '1',
        awesome: '2',
        a: {},
      });

      expect(result.references).toEqual([{ id: '1', name: 'name', type: 'type' }]);
    });

    it('removes a field set to undefined and excludes it from the references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: {
          awesome: '2',
          hello: undefined,
        },
      });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([]);
    });

    it("preserves the reference for a field when it isn't in the object", () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: {
          awesome: '2',
        },
        existingReferences: [{ id: '1', name: 'name', type: 'type' }],
      });

      expect(result.transformedFields).toEqual({
        awesome: '2',
      });

      expect(result.references).toEqual([{ id: '1', name: 'name', type: 'type' }]);
    });

    it('removes reference when field is set to null', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: {
          hello: null,
        },
        existingReferences: [{ id: '2', name: 'name', type: 'type' }],
      });

      expect(result.references).toEqual([]);
    });

    it('removes reference when field is set to undefined', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      const result = migrator.extractFieldsToReferences({
        data: {
          hello: undefined,
        },
        existingReferences: [{ id: '2', name: 'name', type: 'type' }],
      });

      expect(result.references).toEqual([]);
    });
  });

  describe('populateFieldsFromReferencesForPatch', () => {
    it('sets the hello field from references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataBeforeRequest: { hello: '1' },
          dataReturnedFromRequest: asSavedObject({
            references: [{ id: '1', name: 'name', type: 'type' }],
          }),
        })
      ).toEqual({
        attributes: {
          hello: '1',
        },
        references: [{ id: '1', name: 'name', type: 'type' }],
      });
    });

    it('sets the hello field to null when it was null before request', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject(),
          dataBeforeRequest: { hello: null },
        })
      ).toEqual({
        attributes: {
          hello: null,
        },
      });
    });

    it('sets the hello field to undefined when it was undefined before request', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject(),
          dataBeforeRequest: { hello: undefined },
        })
      ).toEqual({ attributes: {} });
    });

    it('sets the hello field to 1 when it exists in references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject({
            data: {
              awesome: '5',
            },
            references: [{ id: '1', name: 'name', type: 'type' }],
          }),
          dataBeforeRequest: {
            awesome: '5',
            hello: '1',
          },
        })
      ).toEqual({
        attributes: {
          awesome: '5',
          hello: '1',
        },
        references: [{ id: '1', name: 'name', type: 'type' }],
      });
    });

    it('sets the hello field to 1 when it exists in the data before the request but not the references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject({ data: { awesome: '5' }, references: [] }),
          dataBeforeRequest: { awesome: '5', hello: '1' },
        })
      ).toEqual({
        attributes: {
          awesome: '5',
          hello: '1',
        },
        references: [],
      });
    });

    it('sets the hello field to 1 when it exists in the data before the request and when references is undefined', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject({ data: { awesome: '5' } }),
          dataBeforeRequest: { awesome: '5', hello: '1' },
        })
      ).toEqual({
        attributes: {
          awesome: '5',
          hello: '1',
        },
      });
    });

    it('does not set hello field when it is not in the data before the request even when it is in the references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferencesForPatch({
          dataReturnedFromRequest: asSavedObject({
            data: { awesome: '5' },
            references: [{ id: '1', name: 'name', type: 'type' }],
          }),
          dataBeforeRequest: {
            awesome: '5',
          },
        })
      ).toEqual({
        attributes: {
          awesome: '5',
        },
        references: [{ id: '1', name: 'name', type: 'type' }],
      });
    });
  });

  describe('populateFieldsFromReferences', () => {
    it('sets hello to 1 when it is in the references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferences(
          asSavedObject({
            references: [{ id: '1', name: 'name', type: 'type' }],
          })
        )
      ).toEqual({
        attributes: {
          hello: '1',
        },
        references: [{ id: '1', name: 'name', type: 'type' }],
      });
    });

    it('sets hello to 1 when it is in the references and preserves existing values', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(
        migrator.populateFieldsFromReferences(
          asSavedObject({
            data: { bananas: 'awesome' },
            references: [{ id: '1', name: 'name', type: 'type' }],
          })
        )
      ).toEqual({
        attributes: {
          bananas: 'awesome',
          hello: '1',
        },
        references: [{ id: '1', name: 'name', type: 'type' }],
      });
    });

    it('sets hello to null when it is not in the references', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(migrator.populateFieldsFromReferences(asSavedObject())).toEqual({
        attributes: {
          hello: null,
        },
      });
    });

    it('sets hello to null when references is undefined', () => {
      const migrator = new FieldMigrator([{ path: 'hello', type: 'type', name: 'name' }]);

      expect(migrator.populateFieldsFromReferences(asSavedObject())).toEqual({
        attributes: {
          hello: null,
        },
      });
    });

    it('sets hello to null and hi to null when it is not in the references', () => {
      const migrator = new FieldMigrator([
        { path: 'hello', type: 'type', name: 'name' },
        { path: 'hi', type: 'hiType', name: 'hiName' },
      ]);

      expect(migrator.populateFieldsFromReferences(asSavedObject())).toEqual({
        attributes: {
          hello: null,
          hi: null,
        },
      });
    });
  });
});

function asSavedObject({
  data,
  references,
}: {
  data?: object;
  references?: SavedObjectReference[];
} = {}): SavedObject<object> {
  return {
    attributes: {
      ...data,
    },
    references,
  } as SavedObject<object>;
}
