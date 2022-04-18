/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import { last } from 'lodash';
import {
  loadInitialState,
  loadIndexPatterns,
  changeIndexPattern,
  changeLayerIndexPattern,
  syncExistingFields,
  extractReferences,
  injectReferences,
} from './loader';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { HttpFetchError } from '@kbn/core/public';
import {
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPattern,
} from './types';
import { createMockedRestrictedIndexPattern, createMockedIndexPattern } from './mocks';
import { documentField } from './document_field';
import { DateHistogramIndexPatternColumn } from './operations';

const createMockStorage = (lastData?: Record<string, string>) => {
  return {
    get: jest.fn().mockImplementation(() => lastData),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

const indexPattern1 = {
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
    {
      name: 'geo.src',
      displayName: 'geo.src',
      type: 'string',
      aggregatable: true,
      searchable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'scripted',
      displayName: 'Scripted',
      type: 'string',
      searchable: true,
      aggregatable: true,
      scripted: true,
      lang: 'painless',
      script: '1234',
    },
    documentField,
  ],
} as unknown as IndexPattern;

const sampleIndexPatternsFromService = {
  '1': createMockedIndexPattern(),
  '2': createMockedRestrictedIndexPattern(),
};

const indexPattern2 = {
  id: '2',
  title: 'my-fake-restricted-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: true,
  fieldFormatMap: { bytes: { id: 'bytes', params: { pattern: '0.0' } } },
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
        average: {
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
      lang: 'painless',
      script: '1234',
      aggregationRestrictions: {
        terms: {
          agg: 'terms',
        },
      },
    },
    documentField,
  ],
} as unknown as IndexPattern;

const sampleIndexPatterns = {
  '1': indexPattern1,
  '2': indexPattern2,
};

function mockIndexPatternsService() {
  return {
    get: jest.fn(async (id: '1' | '2') => {
      const result = { ...sampleIndexPatternsFromService[id], metaFields: [] };
      if (!result.fields) {
        result.fields = [];
      }
      return result;
    }),
    getIdsWithTitle: jest.fn(async () => {
      return [
        {
          id: sampleIndexPatterns[1].id,
          title: sampleIndexPatterns[1].title,
        },
        {
          id: sampleIndexPatterns[2].id,
          title: sampleIndexPatterns[2].title,
        },
      ];
    }),
  } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle'>;
}

describe('loader', () => {
  describe('loadIndexPatterns', () => {
    it('should not load index patterns that are already loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['1', '2'],
        indexPatternsService: {
          get: jest.fn(() =>
            Promise.reject('mockIndexPatternService.get should not have been called')
          ),
          getIdsWithTitle: jest.fn(),
        } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle'>,
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
        indexPatternsService: {
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            metaFields: [],
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
          getIdsWithTitle: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
          })),
        } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle'>,
      });

      expect(cache.foo.getFieldByName('bytes')!.aggregationRestrictions).toEqual({
        sum: { agg: 'sum' },
      });
      expect(cache.foo.getFieldByName('timestamp')!.aggregationRestrictions).toEqual({
        date_histogram: { agg: 'date_histogram', fixed_interval: 'm' },
      });
    });

    it('should map meta flag', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        indexPatternsService: {
          get: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
            metaFields: ['timestamp'],
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
          getIdsWithTitle: jest.fn(async () => ({
            id: 'foo',
            title: 'Foo index',
          })),
        } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle'>,
      });

      expect(cache.foo.getFieldByName('timestamp')!.meta).toEqual(true);
    });
  });

  describe('loadInitialState', () => {
    it('should load a default state', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        indexPatternsService: mockIndexPatternsService(),
        storage,
        options: { isFullEditor: true },
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

    it('should load a default state without loading the indexPatterns when embedded', async () => {
      const storage = createMockStorage();
      const indexPatternsService = mockIndexPatternsService();
      const state = await loadInitialState({
        indexPatternsService,
        storage,
        options: { isFullEditor: false },
      });

      expect(state).toMatchObject({
        currentIndexPatternId: undefined,
        indexPatternRefs: [],
        indexPatterns: {},
        layers: {},
      });

      expect(storage.set).not.toHaveBeenCalled();
      expect(indexPatternsService.getIdsWithTitle).not.toHaveBeenCalled();
    });

    it('should load a default state when lastUsedIndexPatternId is not found in indexPatternRefs', async () => {
      const storage = createMockStorage({ indexPatternId: 'c' });
      const state = await loadInitialState({
        indexPatternsService: mockIndexPatternsService(),
        storage,
        options: { isFullEditor: true },
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
        indexPatternsService: mockIndexPatternsService(),
        storage: createMockStorage({ indexPatternId: '2' }),
        options: { isFullEditor: true },
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
        indexPatternsService: mockIndexPatternsService(),
        storage,
        options: { isFullEditor: true },
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

    it('should use the indexPatternId of the visualize trigger field, if provided', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        indexPatternsService: mockIndexPatternsService(),
        storage,
        initialContext: {
          indexPatternId: '1',
          fieldName: '',
        },
        options: { isFullEditor: true },
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

    it('should use the indexPatternId of the visualize trigger chart context, if provided', async () => {
      const storage = createMockStorage();
      const state = await loadInitialState({
        indexPatternsService: mockIndexPatternsService(),
        storage,
        initialContext: {
          layers: [
            {
              indexPatternId: '1',
              timeFieldName: 'timestamp',
              chartType: 'area',
              axisPosition: 'left',
              metrics: [],
              timeInterval: 'auto',
            },
          ],
          type: 'lnsXY',
          configuration: {
            legend: {
              isVisible: true,
              position: 'right',
              shouldTruncate: true,
              maxLines: true,
            },
            gridLinesVisibility: {
              x: true,
              yLeft: true,
              yRight: true,
            },
          },
          savedObjectId: '',
          isVisualizeAction: true,
        },
        options: { isFullEditor: true },
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

    it('should initialize all the embeddable references without local storage', async () => {
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
              } as DateHistogramIndexPatternColumn,
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
      const storage = createMockStorage({});
      const state = await loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
          { name: 'another-reference', id: 'c', type: 'index-pattern' },
        ],
        indexPatternsService: mockIndexPatternsService(),
        storage,
        options: { isFullEditor: false },
      });

      expect(state).toMatchObject({
        currentIndexPatternId: undefined,
        indexPatternRefs: [],
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        layers: { layerb: { ...savedState.layers.layerb, indexPatternId: '2' } },
      });
      expect(storage.set).not.toHaveBeenCalled();
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
              } as DateHistogramIndexPatternColumn,
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
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
          { name: 'another-reference', id: 'c', type: 'index-pattern' },
        ],
        indexPatternsService: mockIndexPatternsService(),
        storage,
        options: { isFullEditor: true },
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

    it('should default to the first loaded index pattern if could not load any used one or one from the storage', async () => {
      function mockIndexPatternsServiceWithConflict() {
        return {
          get: jest.fn(async (id: '1' | '2' | 'conflictId') => {
            if (id === 'conflictId') {
              return Promise.reject(new Error('Oh noes conflict boom'));
            }
            const result = { ...sampleIndexPatternsFromService[id], metaFields: [] };
            if (!result.fields) {
              result.fields = [];
            }
            return result;
          }),
          getIdsWithTitle: jest.fn(async () => {
            return [
              {
                id: sampleIndexPatterns[1].id,
                title: sampleIndexPatterns[1].title,
              },
              {
                id: sampleIndexPatterns[2].id,
                title: sampleIndexPatterns[2].title,
              },
              {
                id: 'conflictId',
                title: 'conflictId title',
              },
            ];
          }),
        } as unknown as Pick<DataViewsContract, 'get' | 'getIdsWithTitle'>;
      }
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
              } as DateHistogramIndexPatternColumn,
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
      const storage = createMockStorage({ indexPatternId: 'conflictId' });
      const state = await loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-layer-layerb', id: 'conflictId', type: 'index-pattern' },
        ],
        indexPatternsService: mockIndexPatternsServiceWithConflict(),
        storage,
        options: { isFullEditor: true },
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '1',
        indexPatternRefs: [
          { id: 'conflictId', title: 'conflictId title' },
          { id: '1', title: sampleIndexPatterns['1'].title },
          { id: '2', title: sampleIndexPatterns['2'].title },
        ],
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
        layers: { layerb: { ...savedState.layers.layerb, indexPatternId: 'conflictId' } },
      });

      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
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
              operationType: 'average',
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
              operationType: 'average',
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
      const [fn, options] = setState.mock.calls[0];
      expect(options).toEqual({ applyImmediately: true });
      expect(fn(state)).toMatchObject({
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
          getIdsWithTitle: jest.fn(),
        },
        onError,
        storage,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(Error('Missing indexpatterns'));
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
              } as DateHistogramIndexPatternColumn,
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
                  interval: 'm',
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
          getIdsWithTitle: jest.fn(),
        },
        onError,
        storage,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(Error('Missing indexpatterns'));
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
      const fetchJson = jest.fn((path: string) => {
        const indexPatternTitle = last(path.split('/'));
        return {
          indexPatternTitle,
          existingFieldNames: ['field_1', 'field_2'].map(
            (fieldName) => `ip${indexPatternTitle}_${fieldName}`
          ),
        };
      }) as unknown as HttpHandler;

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

      const [fn, options] = setState.mock.calls[0];
      expect(options).toEqual({ applyImmediately: true });
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      });

      expect(newState).toEqual({
        foo: 'bar',
        isFirstExistenceFetch: false,
        existenceFetchFailed: false,
        existenceFetchTimeout: false,
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
      const fetchJson = jest.fn((path: string) => {
        const indexPatternTitle = last(path.split('/'));
        return {
          indexPatternTitle,
          existingFieldNames:
            indexPatternTitle === '1'
              ? ['field_1', 'field_2'].map((fieldName) => `${indexPatternTitle}_${fieldName}`)
              : [],
        };
      }) as unknown as HttpHandler;

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
      const fetchJson = jest.fn((path: string) => {
        return new Promise((resolve, reject) => {
          reject(new Error());
        });
      }) as unknown as HttpHandler;

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

      const [fn, options] = setState.mock.calls[0];
      expect(options).toEqual({ applyImmediately: true });
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      }) as IndexPatternPrivateState;

      expect(newState.existenceFetchFailed).toEqual(true);
      expect(newState.existenceFetchTimeout).toEqual(false);
      expect(newState.existingFields['1']).toEqual({
        field1: true,
        field2: true,
      });
    });

    it('should set all fields to available and existence error flag if the request times out', async () => {
      const setState = jest.fn();
      const fetchJson = jest.fn((path: string) => {
        return new Promise((resolve, reject) => {
          reject(
            new HttpFetchError(
              'timeout',
              'name',
              {} as unknown as Request,
              { status: 408 } as unknown as Response
            )
          );
        });
      }) as unknown as HttpHandler;

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

      const [fn, options] = setState.mock.calls[0];
      expect(options).toEqual({ applyImmediately: true });
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      }) as IndexPatternPrivateState;

      expect(newState.existenceFetchFailed).toEqual(false);
      expect(newState.existenceFetchTimeout).toEqual(true);
      expect(newState.existingFields['1']).toEqual({
        field1: true,
        field2: true,
      });
    });
  });
});
