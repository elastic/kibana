/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsBulkUpdateObject } from 'kibana/public';
import { SavedObjectIndexStore } from './saved_object_store';

describe('LensStore', () => {
  function testStore(testId?: string) {
    const client = {
      create: jest.fn(() => Promise.resolve({ id: testId || 'testid' })),
      bulkUpdate: jest.fn(([{ id }]: SavedObjectsBulkUpdateObject[]) =>
        Promise.resolve({ savedObjects: [{ id }, { id }] })
      ),
      get: jest.fn(),
    };

    return {
      client,
      store: new SavedObjectIndexStore((client as unknown) as SavedObjectsClientContract),
    };
  }

  describe('save', () => {
    test('creates and returns a visualization document', async () => {
      const { client, store } = testStore('FOO');
      const doc = await store.save({
        title: 'Hello',
        description: 'My doc',
        visualizationType: 'bar',
        references: [],
        state: {
          datasourceMetaData: {
            numberFilterableIndexPatterns: 0,
          },
          datasourceStates: {
            indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
          },
          visualization: { x: 'foo', y: 'baz' },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(doc).toEqual({
        id: 'FOO',
        title: 'Hello',
        description: 'My doc',
        visualizationType: 'bar',
        expression: '',
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [],
          },
          datasourceStates: {
            indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
          },
          visualization: { x: 'foo', y: 'baz' },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.create).toHaveBeenCalledWith('lens', {
        title: 'Hello',
        description: 'My doc',
        visualizationType: 'bar',
        expression: '',
        state: {
          datasourceMetaData: { filterableIndexPatterns: [] },
          datasourceStates: {
            indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
          },
          visualization: { x: 'foo', y: 'baz' },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });
    });

    test('updates and returns a visualization document', async () => {
      const { client, store } = testStore();
      const doc = await store.save({
        id: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        references: [],
        state: {
          datasourceMetaData: { numberFilterableIndexPatterns: 0 },
          datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
          visualization: { gear: ['staff', 'pointy hat'] },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(doc).toEqual({
        id: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        expression: '',
        state: {
          datasourceMetaData: { filterableIndexPatterns: [] },
          datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
          visualization: { gear: ['staff', 'pointy hat'] },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(client.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(client.bulkUpdate).toHaveBeenCalledWith([
        {
          type: 'lens',
          id: 'Gandalf',
          attributes: {
            title: null,
            visualizationType: null,
            expression: null,
            state: null,
          },
        },
        {
          type: 'lens',
          id: 'Gandalf',
          attributes: {
            title: 'Even the very wise cannot see all ends.',
            visualizationType: 'line',
            expression: '',
            state: {
              datasourceMetaData: { filterableIndexPatterns: [] },
              datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
              visualization: { gear: ['staff', 'pointy hat'] },
              query: { query: '', language: 'lucene' },
              filters: [],
            },
          },
        },
      ]);
    });
  });

  describe('load', () => {
    test('throws if an error is returned', async () => {
      const { client, store } = testStore();
      client.get = jest.fn(async () => ({
        id: 'Paul',
        type: 'lens',
        attributes: {
          title: 'Hope clouds observation.',
          visualizationType: 'dune',
          state: '{ "datasource": { "giantWorms": true } }',
        },
        error: new Error('shoot dang!'),
      }));

      await expect(store.load('Paul')).rejects.toThrow('shoot dang!');
    });
  });
});
