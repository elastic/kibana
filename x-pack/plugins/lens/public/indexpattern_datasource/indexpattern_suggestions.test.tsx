/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourceSuggestion } from '../types';
import { generateId } from '../id_generator';
import type { IndexPatternPrivateState } from './types';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
  IndexPatternSuggestion,
} from './indexpattern_suggestions';
import { documentField } from './document_field';
import { getFieldByNameFactory } from './pure_helpers';

jest.mock('./loader');
jest.mock('../id_generator');

const fieldsOne = [
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
  },
  {
    name: 'dest',
    displayName: 'dest',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes_range',
    displayName: 'bytes_range',
    type: 'number_range',
    aggregatable: true,
    searchable: true,
  },
  {
    ...documentField,
    displayName: 'Records label',
  },
];

const fieldsTwo = [
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
    aggregationRestrictions: {
      terms: {
        agg: 'terms',
      },
    },
  },
  documentField,
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: false,
    fields: fieldsOne,
    getFieldByName: getFieldByNameFactory(fieldsOne),
  },
  2: {
    id: '2',
    title: 'my-fake-restricted-pattern',
    hasRestrictions: true,
    timeFieldName: 'timestamp',
    fields: fieldsTwo,
    getFieldByName: getFieldByNameFactory(fieldsTwo),
  },
};

function testInitialState(): IndexPatternPrivateState {
  return {
    currentIndexPatternId: '1',
    indexPatternRefs: [],
    existingFields: {},
    indexPatterns: expectedIndexPatterns,
    layers: {
      first: {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'My Op',
            customLabel: true,
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'dest',
            params: {
              size: 5,
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
            },
          },
        },
      },
    },
    isFirstExistenceFetch: false,
  };
}

// Simplifies the debug output for failed test
function getSuggestionSubset(
  suggestions: IndexPatternSuggestion[]
): Array<Omit<IndexPatternSuggestion, 'state'>> {
  return suggestions.map((s) => {
    const newSuggestion = { ...s } as Omit<IndexPatternSuggestion, 'state'> & {
      state?: IndexPatternPrivateState;
    };
    delete newSuggestion.state;
    return newSuggestion;
  });
}

describe('IndexPattern Data Source suggestions', () => {
  beforeEach(async () => {
    let count = 0;
    jest.resetAllMocks();
    (generateId as jest.Mock).mockImplementation(() => `id${++count}`);
  });

  describe('#getDatasourceSuggestionsForField', () => {
    describe('with no layer', () => {
      function stateWithoutLayer() {
        return {
          ...testInitialState(),
          layers: {},
        };
      }

      it('should apply a bucketed aggregation for a string field, using metric for sorting', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithoutLayer(), '1', {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id3', 'id2'],
                  columns: {
                    id3: expect.objectContaining({
                      operationType: 'terms',
                      sourceField: 'source',
                      params: expect.objectContaining({
                        size: 5,
                        orderBy: { columnId: 'id2', type: 'column' },
                      }),
                    }),
                    id2: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id3',
                }),
                expect.objectContaining({
                  columnId: 'id2',
                }),
              ],
              layerId: 'id1',
            },
          })
        );
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithoutLayer(), '1', {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id3', 'id2'],
                  columns: {
                    id3: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id2: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id3',
                }),
                expect.objectContaining({
                  columnId: 'id2',
                }),
              ],
              layerId: 'id1',
            },
          })
        );
      });

      it('should select a metric for a number field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithoutLayer(), '1', {
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id3', 'id2'],
                  columns: {
                    id3: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id2: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id3',
                }),
                expect.objectContaining({
                  columnId: 'id2',
                }),
              ],
              layerId: 'id1',
            },
          })
        );
      });

      it('should make a metric suggestion for a number field if there is no time field', async () => {
        const state: IndexPatternPrivateState = {
          indexPatternRefs: [],
          existingFields: {},
          currentIndexPatternId: '1',
          isFirstExistenceFetch: false,
          indexPatterns: {
            1: {
              id: '1',
              title: 'no timefield',
              hasRestrictions: false,
              fields: [
                {
                  name: 'bytes',
                  displayName: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],
              getFieldByName: getFieldByNameFactory([
                {
                  name: 'bytes',
                  displayName: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ]),
            },
          },
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
        };

        const suggestions = getDatasourceSuggestionsForField(state, '1', {
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                first: expect.objectContaining({
                  columnOrder: ['id1'],
                  columns: {
                    id1: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });
    });

    describe('with a previous empty layer', () => {
      function stateWithEmptyLayer() {
        const state = testInitialState();
        return {
          ...state,
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columns: {},
              columnOrder: [],
            },
          },
        };
      }

      it('should apply a bucketed aggregation for a string field, using metric for sorting', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithEmptyLayer(), '1', {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id2', 'id1'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'terms',
                      sourceField: 'source',
                      params: expect.objectContaining({
                        size: 5,
                        orderBy: { columnId: 'id1', type: 'column' },
                      }),
                    }),
                    id1: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id2',
                }),
                expect.objectContaining({
                  columnId: 'id1',
                }),
              ],
              layerId: 'previousLayer',
            },
          })
        );
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithEmptyLayer(), '1', {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id2', 'id1'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id1: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id2',
                }),
                expect.objectContaining({
                  columnId: 'id1',
                }),
              ],
              layerId: 'previousLayer',
            },
          })
        );
      });

      it('should select a metric for a number field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithEmptyLayer(), '1', {
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id2', 'id1'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id1: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id2',
                }),
                expect.objectContaining({
                  columnId: 'id1',
                }),
              ],
              layerId: 'previousLayer',
            },
          })
        );
      });

      it('should make a metric suggestion for a number field if there is no time field', async () => {
        const state: IndexPatternPrivateState = {
          indexPatternRefs: [],
          existingFields: {},
          currentIndexPatternId: '1',
          isFirstExistenceFetch: false,
          indexPatterns: {
            1: {
              id: '1',
              title: 'no timefield',
              hasRestrictions: false,
              fields: [
                {
                  name: 'bytes',
                  displayName: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],

              getFieldByName: getFieldByNameFactory([
                {
                  name: 'bytes',
                  displayName: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ]),
            },
          },
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
        };

        const suggestions = getDatasourceSuggestionsForField(state, '1', {
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id1'],
                  columns: {
                    id1: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });

      it('creates a new layer and replaces layer if no match is found', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithEmptyLayer(), '2', {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  indexPatternId: '1',
                }),
                id1: expect.objectContaining({
                  indexPatternId: '2',
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: expect.arrayContaining([]),
              layerId: 'id1',
            },
            keptLayerIds: ['previousLayer'],
          })
        );

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  indexPatternId: '2',
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: false,
              columns: expect.arrayContaining([
                expect.objectContaining({
                  columnId: expect.any(String),
                }),
              ]),
              layerId: 'id1',
            },
            keptLayerIds: [],
          })
        );
      });
    });

    describe('suggesting extensions to non-empty tables', () => {
      function stateWithNonEmptyTables(): IndexPatternPrivateState {
        const state = testInitialState();

        return {
          ...state,
          currentIndexPatternId: '1',
          layers: {
            previousLayer: {
              indexPatternId: '2',
              columns: {},
              columnOrder: [],
            },
            currentLayer: {
              indexPatternId: '1',
              columns: {
                cola: {
                  dataType: 'string',
                  isBucketed: true,
                  sourceField: 'source',
                  label: 'values of source',
                  customLabel: true,
                  operationType: 'terms',
                  params: {
                    orderBy: { type: 'column', columnId: 'colb' },
                    orderDirection: 'asc',
                    size: 5,
                  },
                },
                colb: {
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: 'bytes',
                  label: 'Avg of bytes',
                  customLabel: true,
                  operationType: 'average',
                },
              },
              columnOrder: ['cola', 'colb'],
            },
          },
        };
      }

      it('replaces an existing date histogram column on date field', () => {
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(
          {
            ...initialState,
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: {
                ...initialState.layers.currentLayer,
                columns: {
                  cola: {
                    dataType: 'date',
                    isBucketed: true,
                    sourceField: 'timestamp',
                    label: 'timestamp',
                    operationType: 'date_histogram',
                    params: {
                      interval: 'w',
                    },
                  },
                  colb: {
                    dataType: 'number',
                    isBucketed: false,
                    sourceField: 'bytes',
                    label: 'Avg of bytes',
                    customLabel: true,
                    operationType: 'average',
                  },
                },
              },
            },
          },
          '1',
          {
            name: 'start_date',
            displayName: 'start_date',
            type: 'date',
            aggregatable: true,
            searchable: true,
          }
        );

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'colb'],
                  columns: {
                    cola: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'start_date',
                    }),
                    colb: initialState.layers.currentLayer.columns.colb,
                  },
                }),
              },
            }),
          })
        );
      });

      it('puts a date histogram column after the last bucket column on date field', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'newid', 'colb'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    newid: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'extended',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'cola',
                }),
                expect.objectContaining({
                  columnId: 'newid',
                }),
                expect.objectContaining({
                  columnId: 'colb',
                }),
              ],
              layerId: 'currentLayer',
            },
          })
        );
      });

      it('does not use the same field for bucketing multiple times', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithNonEmptyTables(), '1', {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        // Check that the suggestion is a single metric
        expect(suggestions[0].table.columns).toHaveLength(1);
        expect(suggestions[0].table.columns[0].operation.isBucketed).toBeFalsy();
      });

      it('appends a terms column with default size on string field', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'dest',
          displayName: 'dest',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'newid', 'colb'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    newid: expect.objectContaining({
                      operationType: 'terms',
                      sourceField: 'dest',
                      params: expect.objectContaining({ size: 3 }),
                    }),
                  },
                }),
              },
            }),
          })
        );
      });

      it('suggests both replacing and adding metric if only one other metric is set', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'memory',
          displayName: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: expect.objectContaining({
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'colb'],
                  columns: {
                    cola: initialState.layers.currentLayer.columns.cola,
                    colb: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'memory',
                    }),
                  },
                }),
              }),
            }),
          })
        );

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: expect.objectContaining({
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'colb', 'newid'],
                  columns: {
                    cola: initialState.layers.currentLayer.columns.cola,
                    colb: initialState.layers.currentLayer.columns.colb,
                    newid: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'memory',
                    }),
                  },
                }),
              }),
            }),
          })
        );
      });

      it('adds a metric column on a number field if no other metrics set', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            currentLayer: {
              ...initialState.layers.currentLayer,
              columns: {
                cola: {
                  dataType: 'string',
                  isBucketed: true,
                  sourceField: 'source',
                  label: 'values of source',
                  customLabel: true,
                  operationType: 'terms',
                  params: {
                    orderBy: { type: 'alphabetical', fallback: false },
                    orderDirection: 'asc',
                    size: 5,
                  },
                },
              },
              columnOrder: ['cola'],
            },
          },
        };
        const suggestions = getDatasourceSuggestionsForField(modifiedState, '1', {
          name: 'memory',
          displayName: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: modifiedState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['cola', 'newid'],
                  columns: {
                    ...modifiedState.layers.currentLayer.columns,
                    newid: expect.objectContaining({
                      operationType: 'median',
                      sourceField: 'memory',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });

      it('skips duplicates when the field is already in use', () => {
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).not.toContain(expect.objectContaining({ changeType: 'extended' }));
      });

      it('skips duplicates when the document-specific field is already in use', () => {
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            currentLayer: {
              ...initialState.layers.currentLayer,
              columns: {
                ...initialState.layers.currentLayer.columns,
                colb: {
                  label: 'Count of records',
                  dataType: 'document',
                  isBucketed: false,

                  operationType: 'count',
                  sourceField: 'Records',
                },
              },
            },
          },
        };
        const suggestions = getDatasourceSuggestionsForField(modifiedState, '1', documentField);
        expect(suggestions).not.toContain(expect.objectContaining({ changeType: 'extended' }));
      });

      it('hides any referenced metrics when adding new metrics', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            currentLayer: {
              indexPatternId: '1',
              columnOrder: ['date', 'metric', 'ref'],
              columns: {
                date: {
                  label: '',
                  customLabel: true,
                  dataType: 'date',
                  isBucketed: true,
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: { interval: 'auto' },
                },
                metric: {
                  label: '',
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'average',
                  sourceField: 'bytes',
                },
                ref: {
                  label: '',
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
              },
            },
          },
        };
        const suggestions = getSuggestionSubset(
          getDatasourceSuggestionsForField(modifiedState, '1', documentField)
        );
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            table: expect.objectContaining({
              isMultiRow: true,
              changeType: 'extended',
              label: undefined,
              layerId: 'currentLayer',
              columns: [
                {
                  columnId: 'date',
                  operation: expect.objectContaining({ dataType: 'date', isBucketed: true }),
                },
                {
                  columnId: 'ref',
                  operation: expect.objectContaining({ dataType: 'number', isBucketed: false }),
                },
                {
                  columnId: 'newid',
                  operation: expect.objectContaining({ dataType: 'number', isBucketed: false }),
                },
              ],
            }),
            keptLayerIds: ['currentLayer'],
          })
        );
      });

      it('makes a suggestion to extending from an invalid state with a new metric', () => {
        (generateId as jest.Mock).mockReturnValue('newid');
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            currentLayer: {
              indexPatternId: '1',
              columnOrder: ['metric', 'ref'],
              columns: {
                metric: {
                  label: '',
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'average',
                  sourceField: 'bytes',
                },
                ref: {
                  label: '',
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
              },
            },
          },
        };
        const suggestions = getSuggestionSubset(
          getDatasourceSuggestionsForField(modifiedState, '1', documentField)
        );
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            table: expect.objectContaining({
              changeType: 'extended',
              columns: [
                {
                  columnId: 'ref',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: '',
                    scale: undefined,
                  },
                },
                {
                  columnId: 'newid',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Count of records',
                    scale: 'ratio',
                  },
                },
              ],
            }),
          })
        );
      });
    });

    describe('finding the layer that is using the current index pattern', () => {
      function stateWithCurrentIndexPattern(): IndexPatternPrivateState {
        const state = testInitialState();

        return {
          ...state,
          currentIndexPatternId: '1',
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columns: {},
              columnOrder: [],
            },
            currentLayer: {
              indexPatternId: '2',
              columns: {},
              columnOrder: [],
            },
          },
        };
      }

      it('suggests on the layer that matches by indexPatternId', () => {
        const initialState = stateWithCurrentIndexPattern();
        const suggestions = getDatasourceSuggestionsForField(initialState, '2', {
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
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['id2', 'id1'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id1: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id2',
                }),
                expect.objectContaining({
                  columnId: 'id1',
                }),
              ],
              layerId: 'currentLayer',
            },
          })
        );
      });

      it('suggests on the layer with the fewest columns that matches by indexPatternId', () => {
        const initialState = stateWithCurrentIndexPattern();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                currentLayer: initialState.layers.currentLayer,
                previousLayer: expect.objectContaining({
                  columnOrder: ['id2', 'id1'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id1: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });
    });
  });

  describe('#getDatasourceSuggestionsForVisualizeField', () => {
    describe('with no layer', () => {
      function stateWithoutLayer() {
        return {
          ...testInitialState(),
          layers: {},
        };
      }

      it('should return an empty array if the field does not exist', () => {
        const suggestions = getDatasourceSuggestionsForVisualizeField(
          stateWithoutLayer(),
          '1',
          'field_not_exist'
        );

        expect(suggestions).toEqual([]);
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = getDatasourceSuggestionsForVisualizeField(
          stateWithoutLayer(),
          '1',
          'source'
        );

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id3', 'id2'],
                  columns: {
                    id3: expect.objectContaining({
                      operationType: 'terms',
                      sourceField: 'source',
                      params: expect.objectContaining({ size: 5 }),
                    }),
                    id2: expect.objectContaining({
                      operationType: 'count',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
              isMultiRow: true,
              columns: [
                expect.objectContaining({
                  columnId: 'id3',
                }),
                expect.objectContaining({
                  columnId: 'id2',
                }),
              ],
              layerId: 'id1',
            },
          })
        );
      });
    });
  });

  describe('#getDatasourceSuggestionsFromCurrentState', () => {
    it('returns no suggestions if there are no columns', () => {
      expect(
        getDatasourceSuggestionsFromCurrentState({
          isFirstExistenceFetch: false,
          indexPatternRefs: [],
          existingFields: {},
          indexPatterns: expectedIndexPatterns,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
          currentIndexPatternId: '1',
        })
      ).toEqual([]);
    });

    it('returns a single suggestion containing the current columns for each layer', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          ...initialState.layers,
          second: {
            ...initialState.layers.first,
            columnOrder: ['cola'],
            columns: {
              cola: {
                label: 'My Op 2',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,

                // Private
                operationType: 'terms',
                sourceField: 'dest',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
            },
          },
        },
      };

      const result = getDatasourceSuggestionsFromCurrentState(state);

      expect(result).toContainEqual(
        expect.objectContaining({
          table: expect.objectContaining({
            isMultiRow: true,
            changeType: 'unchanged',
            label: undefined,
            layerId: 'first',
          }),
          keptLayerIds: ['first', 'second'],
        })
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'layers',
            label: 'Show only layer 1',
            columns: [
              {
                columnId: 'col1',
                operation: {
                  label: 'My Op',
                  dataType: 'string',
                  isBucketed: true,
                  scale: undefined,
                },
              },
            ],
            layerId: 'first',
          },
        })
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'layers',
            label: 'Show only layer 2',
            columns: [
              {
                columnId: 'cola',
                operation: {
                  label: 'My Op 2',
                  dataType: 'string',
                  isBucketed: true,
                  scale: undefined,
                },
              },
            ],
            layerId: 'second',
          },
        })
      );
    });

    it('returns a metric over time for single metric tables', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['cola'],
            columns: {
              cola: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                operationType: 'average',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      };

      expect(getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state))).toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'extended',
            label: 'Over time',
            columns: [
              {
                columnId: 'id1',
                operation: {
                  label: 'timestampLabel',
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'cola',
                operation: {
                  label: 'My Op',
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                },
              },
            ],
            layerId: 'first',
          },
        })
      );
    });

    it('adds date histogram over default time field for tables without time dimension', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['cola', 'colb'],
            columns: {
              cola: {
                label: 'My Terms',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,
                operationType: 'terms',
                sourceField: 'source',
                scale: 'ordinal',
                params: {
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                  size: 5,
                },
              },
              colb: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                operationType: 'average',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      };

      expect(getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state))).toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'extended',
            label: 'Over time',
            columns: [
              {
                columnId: 'cola',
                operation: {
                  label: 'My Terms',
                  dataType: 'string',
                  isBucketed: true,
                  scale: 'ordinal',
                },
              },
              {
                columnId: 'id1',
                operation: {
                  label: 'timestampLabel',
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'colb',
                operation: {
                  label: 'My Op',
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                },
              },
            ],
            layerId: 'first',
          },
        })
      );
    });

    it('does not create an over time suggestion if tables with numeric buckets with time dimension', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['colb', 'cola'],
            columns: {
              cola: {
                dataType: 'number',
                isBucketed: false,
                sourceField: 'dest',
                label: 'Unique count of dest',
                operationType: 'unique_count',
              },
              colb: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: true,
                operationType: 'range',
                sourceField: 'bytes',
                scale: 'interval',
                params: {
                  type: 'histogram',
                  maxBars: 100,
                  ranges: [],
                },
              },
            },
          },
        },
      };

      expect(getDatasourceSuggestionsFromCurrentState(state)).not.toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            label: 'Over time',
            layerId: 'first',
          },
        })
      );
    });

    it('adds date histogram over default time field for custom range intervals', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['colb', 'cola'],
            columns: {
              cola: {
                dataType: 'number',
                isBucketed: false,
                sourceField: 'dest',
                label: 'Unique count of dest',
                operationType: 'unique_count',
              },
              colb: {
                label: 'My Custom Range',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,
                operationType: 'range',
                sourceField: 'bytes',
                scale: 'ordinal',
                params: {
                  type: 'range',
                  maxBars: 100,
                  ranges: [{ from: 1, to: 2, label: '' }],
                },
              },
            },
          },
        },
      };

      expect(getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state))).toContainEqual(
        expect.objectContaining({
          table: {
            changeType: 'extended',
            columns: [
              {
                columnId: 'colb',
                operation: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'My Custom Range',
                  scale: 'ordinal',
                },
              },
              {
                columnId: 'id1',
                operation: {
                  dataType: 'date',
                  isBucketed: true,
                  label: 'timestampLabel',
                  scale: 'interval',
                },
              },
              {
                columnId: 'cola',
                operation: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Unique count of dest',
                  scale: undefined,
                },
              },
            ],
            isMultiRow: true,
            label: 'Over time',
            layerId: 'first',
          },
        })
      );
    });

    it('does not create an over time suggestion if there is no default time field', async () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        ...initialState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['id1'],
            columns: {
              id1: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                operationType: 'average',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      };
      const suggestions = getDatasourceSuggestionsFromCurrentState({
        ...state,
        indexPatterns: { 1: { ...state.indexPatterns['1'], timeFieldName: undefined } },
      });
      suggestions.forEach((suggestion) => expect(suggestion.table.columns.length).toBe(1));
    });

    it('returns simplified versions of table with more than 2 columns', () => {
      const initialState = testInitialState();
      const fields = [
        {
          name: 'field1',
          displayName: 'field1',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'field2',
          displayName: 'field2',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'field3',
          displayName: 'field3Label',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'field4',
          displayName: 'field4',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'field5',
          displayName: 'field5',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
      ];
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            hasRestrictions: false,
            fields,
            getFieldByName: getFieldByNameFactory(fields),
          },
        },
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              col1: {
                label: 'My Op',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field1',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col2: {
                label: 'My Op',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field2',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col3: {
                label: 'My Op',
                customLabel: true,
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field3',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col4: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: false,

                operationType: 'average',
                sourceField: 'field4',
              },
              col5: {
                label: 'My Op',
                customLabel: true,
                dataType: 'number',
                isBucketed: false,

                operationType: 'min',
                sourceField: 'field5',
              },
            },
            columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5'],
          },
        },
      };

      const suggestions = getDatasourceSuggestionsFromCurrentState(state);

      // 3 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[0], ['col1', 'col2', 'col3', 'col4', 'col5'], 3);

      // 1 bucket col, 1 metric col
      isTableWithBucketColumns(suggestions[1], ['col1', 'col4'], 1);

      // 2 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[2], ['col1', 'col2', 'col4'], 2);

      // 3 bucket cols, 1 metric col
      isTableWithBucketColumns(suggestions[3], ['col1', 'col2', 'col3', 'col4'], 3);

      // first metric col
      isTableWithMetricColumns(suggestions[4], ['col4']);

      // second metric col
      isTableWithMetricColumns(suggestions[5], ['col5']);

      expect(suggestions.length).toBe(6);
    });

    it('returns an only metric version of a given table, but does not include current state as reduced', () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            hasRestrictions: false,
            fields: [
              {
                name: 'field1',
                displayName: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                displayName: 'field2',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
            ],

            getFieldByName: getFieldByNameFactory([
              {
                name: 'field1',
                displayName: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                displayName: 'field2',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
            ]),
          },
        },
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              id1: {
                label: 'field2',
                dataType: 'date',
                isBucketed: true,

                operationType: 'date_histogram',
                sourceField: 'field2',
                params: {
                  interval: 'd',
                },
              },
              id2: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'average',
                sourceField: 'field1',
              },
            },
            columnOrder: ['id1', 'id2'],
          },
        },
      };

      const suggestions = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));
      expect(suggestions).not.toContainEqual(
        expect.objectContaining({
          table: expect.objectContaining({
            changeType: 'reduced',
            columns: [
              expect.objectContaining({
                operation: expect.objectContaining({ label: 'field2' }),
              }),
              expect.objectContaining({
                operation: expect.objectContaining({ label: 'Average of field1' }),
              }),
            ],
          }),
        })
      );
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          table: expect.objectContaining({
            changeType: 'reduced',
            columns: [
              expect.objectContaining({
                operation: expect.objectContaining({ label: 'Average of field1' }),
              }),
            ],
          }),
        })
      );
    });

    it('returns an alternative metric for an only-metric table', () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            hasRestrictions: false,
            fields: [
              {
                name: 'field1',
                displayName: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
            getFieldByName: getFieldByNameFactory([
              {
                name: 'field1',
                displayName: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ]),
          },
        },
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              id1: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'average',
                sourceField: 'field1',
              },
            },
            columnOrder: ['id1'],
          },
        },
      };

      const suggestions = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          table: expect.objectContaining({
            columns: [
              expect.objectContaining({
                operation: expect.objectContaining({ label: 'Median of field1' }),
              }),
            ],
          }),
        })
      );
    });

    it('contains a reordering suggestion when there are exactly 2 buckets', () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: expectedIndexPatterns,
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              id1: {
                label: 'Date histogram',
                dataType: 'date',
                isBucketed: true,

                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'd',
                },
              },
              id2: {
                label: 'Top 5',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'dest',
                params: { size: 5, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
              },
              id3: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'average',
                sourceField: 'bytes',
              },
            },
            columnOrder: ['id1', 'id2', 'id3'],
          },
        },
      };

      const suggestions = getDatasourceSuggestionsFromCurrentState(state);
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          table: expect.objectContaining({
            changeType: 'reorder',
          }),
        })
      );
    });

    it('will generate suggestions even if there are errors from missing fields', () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: expectedIndexPatterns,
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              ...initialState.layers.first.columns,
              col2: {
                label: 'Top 5',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'nonExistingField',
                params: { size: 5, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
              },
            },
            columnOrder: ['col1', 'col2'],
          },
        },
      };

      const suggestions = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          table: {
            changeType: 'unchanged',
            columns: [
              {
                columnId: 'col1',
                operation: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'My Op',
                  scale: undefined,
                },
              },
              {
                columnId: 'col2',
                operation: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Top 5',
                  scale: undefined,
                },
              },
            ],
            isMultiRow: true,
            label: undefined,
            layerId: 'first',
          },
        })
      );
    });

    describe('references', () => {
      it('will extend the table with a date when starting in an invalid state', () => {
        const initialState = testInitialState();
        const state: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            first: {
              ...initialState.layers.first,
              columnOrder: ['metric', 'ref', 'ref2'],
              columns: {
                metric: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'count',
                  sourceField: 'Records',
                },
                ref: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
                ref2: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric2'],
                },
              },
            },
          },
        };

        const result = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));

        expect(result).toContainEqual(
          expect.objectContaining({
            table: expect.objectContaining({
              changeType: 'extended',
              layerId: 'first',
              columns: [
                {
                  columnId: 'id1',
                  operation: {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'timestampLabel',
                    scale: 'interval',
                  },
                },
                {
                  columnId: 'ref',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Cumulative sum of Records label',
                    scale: undefined,
                  },
                },
                {
                  columnId: 'ref2',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Cumulative sum of (incomplete)',
                    scale: undefined,
                  },
                },
              ],
            }),
            keptLayerIds: ['first'],
          })
        );
      });

      it('will make an unchanged suggestion including incomplete references', () => {
        const initialState = testInitialState();
        const state: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            first: {
              ...initialState.layers.first,
              columnOrder: ['date', 'ref', 'ref2'],
              columns: {
                date: {
                  label: '',
                  dataType: 'date',
                  isBucketed: true,
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: { interval: 'auto' },
                },
                ref: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
                ref2: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
              },
            },
          },
        };

        const result = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));

        expect(result).toContainEqual(
          expect.objectContaining({
            table: expect.objectContaining({
              changeType: 'unchanged',
              layerId: 'first',
              columns: [
                {
                  columnId: 'date',
                  operation: {
                    dataType: 'date',
                    isBucketed: true,
                    label: '',
                    scale: undefined,
                  },
                },
                {
                  columnId: 'ref',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: '',
                    scale: undefined,
                  },
                },
                {
                  columnId: 'ref2',
                  operation: {
                    dataType: 'number',
                    isBucketed: false,
                    label: '',
                    scale: undefined,
                  },
                },
              ],
            }),
            keptLayerIds: ['first'],
          })
        );
      });

      it('will skip a reduced suggestion when handling multiple references', () => {
        const initialState = testInitialState();
        const state: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            first: {
              ...initialState.layers.first,
              columnOrder: ['date', 'metric', 'metric2', 'ref', 'ref2'],

              columns: {
                date: {
                  label: '',
                  dataType: 'date',
                  isBucketed: true,
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: { interval: 'auto' },
                },
                metric: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'count',
                  sourceField: 'Records',
                },
                ref: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric'],
                },
                metric2: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'count',
                  sourceField: 'Records',
                },
                ref2: {
                  label: '',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['metric2'],
                },
              },
            },
          },
        };

        const result = getSuggestionSubset(getDatasourceSuggestionsFromCurrentState(state));

        expect(result).not.toContainEqual(
          expect.objectContaining({
            table: expect.objectContaining({
              changeType: 'reduced',
            }),
          })
        );
      });
    });
  });
});

function isTableWithBucketColumns(
  suggestion: DatasourceSuggestion<IndexPatternPrivateState>,
  columnIds: string[],
  numBuckets: number
) {
  expect(suggestion.table.columns.map((column) => column.columnId)).toEqual(columnIds);
  expect(
    suggestion.table.columns.slice(0, numBuckets).every((column) => column.operation.isBucketed)
  ).toBeTruthy();
}

function isTableWithMetricColumns(
  suggestion: DatasourceSuggestion<IndexPatternPrivateState>,
  columnIds: string[]
) {
  expect(suggestion.table.isMultiRow).toEqual(false);
  expect(suggestion.table.columns.map((column) => column.columnId)).toEqual(columnIds);
  expect(suggestion.table.columns.every((column) => !column.operation.isBucketed)).toBeTruthy();
}
