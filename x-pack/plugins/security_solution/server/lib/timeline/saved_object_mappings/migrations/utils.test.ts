/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMigratedDoc, createReference } from './utils';

describe('migration utils', () => {
  describe('createReference', () => {
    it('returns an array with a reference when the id is defined', () => {
      expect(createReference('awesome', 'name', 'type')).toEqual([
        { id: 'awesome', name: 'name', type: 'type' },
      ]);
    });

    it('returns an empty array when the id is undefined', () => {
      expect(createReference(undefined, 'name', 'type')).toHaveLength(0);
    });

    it('returns an empty array when the id is null', () => {
      expect(createReference(null, 'name', 'type')).toHaveLength(0);
    });
  });

  describe('createMigratedDoc', () => {
    it('overwrites the attributes of the original doc', () => {
      const doc = {
        id: '1',
        attributes: {
          hello: '1',
        },
        type: 'yes',
      };

      expect(
        createMigratedDoc({ doc, attributes: {}, docReferences: [], migratedReferences: [] })
      ).toEqual({
        id: '1',
        attributes: {},
        type: 'yes',
        references: [],
      });
    });

    it('combines the references', () => {
      const doc = {
        id: '1',
        attributes: {
          hello: '1',
        },
        type: 'yes',
      };

      expect(
        createMigratedDoc({
          doc,
          attributes: {},
          docReferences: [{ id: '1', name: 'name', type: 'type' }],
          migratedReferences: [{ id: '5', name: 'name5', type: 'type5' }],
        })
      ).toEqual({
        id: '1',
        attributes: {},
        type: 'yes',
        references: [
          { id: '1', name: 'name', type: 'type' },
          { id: '5', name: 'name5', type: 'type5' },
        ],
      });
    });
  });
});
