/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpHandler, SavedObjectsClientContract } from 'kibana/public';
import _ from 'lodash';
import {
  loadInitialState,
  loadIndexPatterns,
  changeIndexPattern,
  changeLayerIndexPattern,
  syncExistingFields,
} from './loader';
import { IndexPatternsContract } from '../../../../../src/plugins/data/public';
import {
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPattern,
} from './types';
import { documentField } from './document_field';

jest.mock('./operations');

const createMockStorage = (lastData?: Record<string, string>) => {
  return {
    get: jest.fn().mockImplementation(() => lastData),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

const indexPatternA = ({
  id: 'a',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestamp',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'start_date',
      displayName: 'start_date',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'memory',
      displayName: 'memory',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'dest',
      displayName: 'dest',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
    documentField,
  ],
} as unknown) as IndexPattern;

const indexPatternB = ({
  id: 'b',
  title: 'my-fake-restricted-pattern',
  timeFieldName: 'timestamp',
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestamp',
      type: 'date',
      aggregatable: true,
      searchable: true,
      aggregationRestrictions: {
        date_histogram: {
          agg: 'date_histogram',
          fixed_interval: '1d',
          delay: '7d',
          time_zone: 'UTC',
        },
      },
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
      aggregationRestrictions: {
        // Ignored in the UI
        histogram: {
          agg: 'histogram',
          interval: 1000,
        },
        avg: {
          agg: 'avg',
        },
        max: {
          agg: 'max',
        },
        min: {
          agg: 'min',
        },
        sum: {
          agg: 'sum',
        },
      },
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: false,
      searchable: false,
      scripted: true,
      aggregationRestrictions: {
        terms: {
          agg: 'terms',
        },
      },
      esTypes: ['keyword'],
    },
    documentField,
  ],
} as unknown) as IndexPattern;

const sampleIndexPatterns = {
  a: indexPatternA,
  b: indexPatternB,
};

function mockClient() {
  return ({
    find: jest.fn(async () => ({
      savedObjects: [
        { id: 'a', attributes: { title: sampleIndexPatterns.a.title } },
        { id: 'b', attributes: { title: sampleIndexPatterns.b.title } },
      ],
    })),
  } as unknown) as Pick<SavedObjectsClientContract, 'find'>;
}

function mockIndexPatternsService() {
  return ({
    get: jest.fn(async (id: 'a' | 'b') => {
      const pattern = sampleIndexPatterns[id];
      return {
        id,
        type: undefined,
        title: pattern.title,
        timeFieldName: pattern.timeFieldName,
        fields: pattern.fields.filter((f) => f.type !== 'document'),
      };
    }),
  } as unknown) as Pick<IndexPatternsContract, 'get'>;
}

describe('loader', () => {
  describe('loadIndexPatterns', () => {
    it('should not load index patterns that are already loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['a', 'b'],
        indexPatternsService: ({
          get: jest.fn(() =>
            Promise.reject('mockIndexPatternService.get should not have been called')
          ),
        } as unknown) as Pick<IndexPatternsContract, 'get'>,
      });

      expect(cache).toEqual(sampleIndexPatterns);
    });

    it('should load index patterns that are not loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: {
          b: sampleIndexPatterns.b,
        },
        patterns: ['a', 'b'],
        indexPatternsService: mockIndexPatternsService(),
      });

      expect(cache).toMatchObject(sampleIndexPatterns);
    });

    it('should allow scripted, but not full text fields', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['a', 'b'],
        indexPatternsService: mockIndexPatternsService(),
      });

      expect(cache).toMatchObject(sampleIndexPatterns);
    });

    it('should apply field restrictions from typeMeta', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        indexPatternsService: ({
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            typeMeta: {
              aggs: {
                date_histogram: {
                  timestamp: {
                    agg: 'date_histogram',
                    fixed_interval: 'm',
                  },
                },
                sum: {
                  bytes: {
                    agg: 'sum',
                  },
                },
              },
            },
            fields: [
              {
                name: 'timestamp',
                displayName: 'timestamp',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'bytes',
                displayName: 'bytes',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          })),
        } as unknown) as Pick<IndexPatternsContract, 'get'>,
      });

      expect(
        cache.foo.fields.find((f: IndexPatternField) => f.name === 'bytes')!.aggregationRestrictions
      ).toEqual({
        sum: { agg: 'sum' },
      });
      expect(
        cache.foo.fields.find((f: IndexPatternField) => f.name === 'timestamp')!
          .aggregationRestrictions
      ).toEqual({
        date_histogram: { agg: 'date_histogram', fixed_interval: 'm' },
      });
    });
  });

  describe('loadInitialState', () => {
    it('should load a default state', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'a',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'a',
      });
    });

    it('should load a default state when lastUsedIndexPatternId is not found in indexPatternRefs', async () => {
      const storage = createMockStorage({ indexPatternId: 'c' });
      const state = await loadInitialState({
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'a',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'a',
      });
    });

    it('should load lastUsedIndexPatternId if in localStorage', async () => {
      const state = await loadInitialState({
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage: createMockStorage({ indexPatternId: 'b' }),
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          b: sampleIndexPatterns.b,
        },
        layers: {},
      });
    });

    it('should use the default index pattern id, if provided', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        defaultIndexPatternId: 'b',
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          b: sampleIndexPatterns.b,
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'b',
      });
    });

    it('should initialize from saved state', async () => {
      const savedState: IndexPatternPersistedState = {
        currentIndexPatternId: 'b',
        layers: {
          layerb: {
            indexPatternId: 'b',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'date',
                isBucketed: true,
                label: 'My date',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              },
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Sum of bytes',
                operationType: 'sum',
                sourceField: 'bytes',
              },
            },
          },
        },
      };
      const storage = createMockStorage({ indexPatternId: 'a' });
      const state = await loadInitialState({
        state: savedState,
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          b: sampleIndexPatterns.b,
        },
        layers: savedState.layers,
      });

      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'b',
      });
    });
  });

  describe('changeIndexPattern', () => {
    it('loads the index pattern and then sets it as current', async () => {
      const setState = jest.fn();
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        indexPatterns: {},
        existingFields: {},
        layers: {},
        isFirstExistenceFetch: false,
      };
      const storage = createMockStorage({ indexPatternId: 'b' });

      await changeIndexPattern({
        state,
        setState,
        id: 'a',
        indexPatternsService: mockIndexPatternsService(),
        onError: jest.fn(),
        storage,
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: 'a',
        indexPatterns: {
          a: {
            ...sampleIndexPatterns.a,
            fields: [...sampleIndexPatterns.a.fields],
          },
        },
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'a',
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        layers: {},
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: 'b' });

      await changeIndexPattern({
        state,
        setState,
        id: 'a',
        indexPatternsService: {
          get: jest.fn(async () => {
            throw err;
          }),
        },
        onError,
        storage,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe('changeLayerIndexPattern', () => {
    it('loads the index pattern and then changes the specified layer', async () => {
      const setState = jest.fn();
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
          },
          l1: {
            columnOrder: ['col2'],
            columns: {
              col2: {
                dataType: 'date',
                isBucketed: true,
                label: 'My hist',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              },
            },
            indexPatternId: 'a',
          },
        },
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: 'a' });

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: 'b',
        layerId: 'l1',
        indexPatternsService: mockIndexPatternsService(),
        onError: jest.fn(),
        storage,
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatterns: {
          a: sampleIndexPatterns.a,
          b: sampleIndexPatterns.b,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
          },
          l1: {
            columnOrder: ['col2'],
            columns: {
              col2: {
                dataType: 'date',
                isBucketed: true,
                label: 'My hist',
                operationType: 'date_histogram',
                params: {
                  interval: '1d',
                },
                sourceField: 'timestamp',
              },
            },
            indexPatternId: 'b',
          },
        },
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: 'b',
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
          },
        },
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: 'b' });

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: 'b',
        layerId: 'l0',
        indexPatternsService: {
          get: jest.fn(async () => {
            throw err;
          }),
        },
        onError,
        storage,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe('syncExistingFields', () => {
    const dslQuery = {
      bool: {
        must: [],
        filter: [{ match_all: {} }],
        should: [],
        must_not: [],
      },
    };

    it('should call once for each index pattern', async () => {
      const setState = jest.fn();
      const fetchJson = (jest.fn((path: string) => {
        const indexPatternTitle = _.last(path.split('/'));
        return {
          indexPatternTitle,
          existingFieldNames: ['field_1', 'field_2'].map(
            (fieldName) => `${indexPatternTitle}_${fieldName}`
          ),
        };
      }) as unknown) as HttpHandler;

      await syncExistingFields({
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        fetchJson,
        indexPatterns: [
          { id: 'a', title: 'a', fields: [] },
          { id: 'b', title: 'a', fields: [] },
          { id: 'c', title: 'a', fields: [] },
        ],
        setState,
        dslQuery,
        showNoDataPopover: jest.fn(),
        currentIndexPatternTitle: 'abc',
        isFirstExistenceFetch: false,
      });

      expect(fetchJson).toHaveBeenCalledTimes(3);
      expect(setState).toHaveBeenCalledTimes(1);

      const [fn] = setState.mock.calls[0];
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      });

      expect(newState).toEqual({
        foo: 'bar',
        isFirstExistenceFetch: false,
        existenceFetchFailed: false,
        existingFields: {
          a: { a_field_1: true, a_field_2: true },
          b: { b_field_1: true, b_field_2: true },
          c: { c_field_1: true, c_field_2: true },
        },
      });
    });

    it('should call showNoDataPopover callback if current index pattern returns no fields', async () => {
      const setState = jest.fn();
      const showNoDataPopover = jest.fn();
      const fetchJson = (jest.fn((path: string) => {
        const indexPatternTitle = _.last(path.split('/'));
        return {
          indexPatternTitle,
          existingFieldNames:
            indexPatternTitle === 'a'
              ? ['field_1', 'field_2'].map((fieldName) => `${indexPatternTitle}_${fieldName}`)
              : [],
        };
      }) as unknown) as HttpHandler;

      const args = {
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        fetchJson,
        indexPatterns: [
          { id: 'a', title: 'a', fields: [] },
          { id: 'b', title: 'a', fields: [] },
          { id: 'c', title: 'a', fields: [] },
        ],
        setState,
        dslQuery,
        showNoDataPopover: jest.fn(),
        currentIndexPatternTitle: 'abc',
        isFirstExistenceFetch: false,
      };

      await syncExistingFields(args);

      expect(showNoDataPopover).not.toHaveBeenCalled();

      await syncExistingFields({ ...args, isFirstExistenceFetch: true });
      expect(showNoDataPopover).not.toHaveBeenCalled();
    });

    it('should set all fields to available and existence error flag if the request fails', async () => {
      const setState = jest.fn();
      const fetchJson = (jest.fn((path: string) => {
        return new Promise((resolve, reject) => {
          reject(new Error());
        });
      }) as unknown) as HttpHandler;

      const args = {
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        fetchJson,
        indexPatterns: [
          {
            id: 'a',
            title: 'a',
            fields: [{ name: 'field1' }, { name: 'field2' }] as IndexPatternField[],
          },
        ],
        setState,
        dslQuery,
        showNoDataPopover: jest.fn(),
        currentIndexPatternTitle: 'abc',
        isFirstExistenceFetch: false,
      };

      await syncExistingFields(args);

      const [fn] = setState.mock.calls[0];
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      }) as IndexPatternPrivateState;

      expect(newState.existenceFetchFailed).toEqual(true);
      expect(newState.existingFields.a).toEqual({
        field1: true,
        field2: true,
      });
    });
  });
});
