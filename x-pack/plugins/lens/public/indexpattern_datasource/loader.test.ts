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
  extractReferences,
  injectReferences,
} from './loader';
import { IndexPatternsContract } from '../../../../../src/plugins/data/public';
import {
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPattern,
} from './types';
import { createMockedRestrictedIndexPattern, createMockedIndexPattern } from './mocks';
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

const indexPattern1 = ({
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
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
      displayName: 'bytes',
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
      name: 'unsupported',
      displayName: 'unsupported',
      type: 'geo',
      aggregatable: true,
      searchable: true,
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

const sampleIndexPatternsFromService = {
  '1': createMockedIndexPattern(),
  '2': createMockedRestrictedIndexPattern(),
};

const indexPattern2 = ({
  id: '2',
  title: 'my-fake-restricted-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: true,
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
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
      aggregatable: true,
      searchable: true,
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
  '1': indexPattern1,
  '2': indexPattern2,
};

function mockClient() {
  return ({
    find: jest.fn(async () => ({
      savedObjects: [
        { id: '1', attributes: { title: sampleIndexPatterns[1].title } },
        { id: '2', attributes: { title: sampleIndexPatterns[2].title } },
      ],
    })),
  } as unknown) as Pick<SavedObjectsClientContract, 'find'>;
}

function mockIndexPatternsService() {
  return ({
    get: jest.fn(async (id: '1' | '2') => {
      return sampleIndexPatternsFromService[id];
    }),
  } as unknown) as Pick<IndexPatternsContract, 'get'>;
}

describe('loader', () => {
  describe('loadIndexPatterns', () => {
    it('should not load index patterns that are already loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['1', '2'],
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
          '2': sampleIndexPatterns['2'],
        },
        patterns: ['1', '2'],
        indexPatternsService: mockIndexPatternsService(),
      });

      expect(cache).toMatchObject(sampleIndexPatterns);
    });

    it('should allow scripted, but not full text fields', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['1', '2'],
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
                displayName: 'timestampLabel',
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
        currentIndexPatternId: '1',
        indexPatternRefs: [
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
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
        currentIndexPatternId: '1',
        indexPatternRefs: [
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('should load lastUsedIndexPatternId if in localStorage', async () => {
      const state = await loadInitialState({
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage: createMockStorage({ indexPatternId: '2' }),
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        indexPatternRefs: [
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        layers: {},
      });
    });

    it('should use the default index pattern id, if provided', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        defaultIndexPatternId: '2',
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        indexPatternRefs: [
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });

    it('should initialize from saved state', async () => {
      const savedState: IndexPatternPersistedState = {
        layers: {
          layerb: {
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
      const storage = createMockStorage({ indexPatternId: '1' });
      const state = await loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-current-indexpattern', id: '2', type: 'index-pattern' },
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
          { name: 'another-reference', id: 'c', type: 'index-pattern' },
        ],
        savedObjectsClient: mockClient(),
        indexPatternsService: mockIndexPatternsService(),
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        indexPatternRefs: [
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        layers: { layerb: { ...savedState.layers.layerb, indexPatternId: '2' } },
      });

      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });
  });

  describe('saved object references', () => {
    const state: IndexPatternPrivateState = {
      currentIndexPatternId: 'b',
      indexPatternRefs: [],
      indexPatterns: {},
      existingFields: {},
      layers: {
        a: {
          indexPatternId: 'id-index-pattern-a',
          columnOrder: ['col1'],
          columns: {
            col1: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'avg',
              sourceField: 'myfield',
            },
          },
        },
        b: {
          indexPatternId: 'id-index-pattern-b',
          columnOrder: ['col2'],
          columns: {
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'avg',
              sourceField: 'myfield2',
            },
          },
        },
      },
      isFirstExistenceFetch: false,
    };

    it('should create a reference for each layer and for current index pattern', () => {
      const { savedObjectReferences } = extractReferences(state);
      expect(savedObjectReferences).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "b",
            "name": "indexpattern-datasource-current-indexpattern",
            "type": "index-pattern",
          },
          Object {
            "id": "id-index-pattern-a",
            "name": "indexpattern-datasource-layer-a",
            "type": "index-pattern",
          },
          Object {
            "id": "id-index-pattern-b",
            "name": "indexpattern-datasource-layer-b",
            "type": "index-pattern",
          },
        ]
      `);
    });

    it('should restore layers', () => {
      const { savedObjectReferences, state: persistedState } = extractReferences(state);
      expect(injectReferences(persistedState, savedObjectReferences).layers).toEqual(state.layers);
    });

    it('should restore current index pattern', () => {
      const { savedObjectReferences, state: persistedState } = extractReferences(state);
      expect(injectReferences(persistedState, savedObjectReferences).currentIndexPatternId).toEqual(
        state.currentIndexPatternId
      );
    });
  });

  describe('changeIndexPattern', () => {
    it('loads the index pattern and then sets it as current', async () => {
      const setState = jest.fn();
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '2',
        indexPatternRefs: [],
        indexPatterns: {},
        existingFields: {},
        layers: {},
        isFirstExistenceFetch: false,
      };
      const storage = createMockStorage({ indexPatternId: '2' });

      await changeIndexPattern({
        state,
        setState,
        id: '1',
        indexPatternsService: mockIndexPatternsService(),
        onError: jest.fn(),
        storage,
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: '1',
        indexPatterns: {
          '1': {
            ...sampleIndexPatterns['1'],
            fields: [...sampleIndexPatterns['1'].fields],
          },
        },
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '2',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        layers: {},
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: '2' });

      await changeIndexPattern({
        state,
        setState,
        id: '1',
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
        currentIndexPatternId: '2',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: '1',
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
            indexPatternId: '1',
          },
        },
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: '1' });

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: '2',
        layerId: 'l1',
        indexPatternsService: mockIndexPatternsService(),
        onError: jest.fn(),
        storage,
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: '2',
        indexPatterns: {
          1: sampleIndexPatterns['1'],
          2: sampleIndexPatterns['2'],
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: '1',
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
            indexPatternId: '2',
          },
        },
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '2',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: '1',
          },
        },
        isFirstExistenceFetch: false,
      };

      const storage = createMockStorage({ indexPatternId: '2' });

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: '2',
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
            (fieldName) => `ip${indexPatternTitle}_${fieldName}`
          ),
        };
      }) as unknown) as HttpHandler;

      await syncExistingFields({
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        fetchJson,
        indexPatterns: [
          { id: '1', title: '1', fields: [], hasRestrictions: false },
          { id: '2', title: '1', fields: [], hasRestrictions: false },
          { id: '3', title: '1', fields: [], hasRestrictions: false },
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
          '1': { ip1_field_1: true, ip1_field_2: true },
          '2': { ip2_field_1: true, ip2_field_2: true },
          '3': { ip3_field_1: true, ip3_field_2: true },
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
            indexPatternTitle === '1'
              ? ['field_1', 'field_2'].map((fieldName) => `${indexPatternTitle}_${fieldName}`)
              : [],
        };
      }) as unknown) as HttpHandler;

      const args = {
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        fetchJson,
        indexPatterns: [
          { id: '1', title: '1', fields: [], hasRestrictions: false },
          { id: '2', title: '1', fields: [], hasRestrictions: false },
          { id: 'c', title: '1', fields: [], hasRestrictions: false },
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
            id: '1',
            title: '1',
            hasRestrictions: false,
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
      expect(newState.existingFields['1']).toEqual({
        field1: true,
        field2: true,
      });
    });
  });
});
