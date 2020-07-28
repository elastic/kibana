/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceSuggestion } from '../types';
import { generateId } from '../id_generator';
import { IndexPatternPrivateState } from './types';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
} from './indexpattern_suggestions';

jest.mock('./loader');
jest.mock('../id_generator');

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'start_date',
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
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'dest',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
  2: {
    id: '2',
    title: 'my-fake-restricted-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
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
        type: 'string',
        aggregatable: true,
        searchable: true,
        aggregationRestrictions: {
          terms: {
            agg: 'terms',
          },
        },
      },
    ],
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
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'op',
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

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithoutLayer(), '1', {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id2', 'id3'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'terms',
                      sourceField: 'source',
                      params: expect.objectContaining({ size: 5 }),
                    }),
                    id3: expect.objectContaining({
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
                  columnId: 'id3',
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
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id2', 'id3'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id3: expect.objectContaining({
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
                  columnId: 'id3',
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
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                id1: expect.objectContaining({
                  columnOrder: ['id2', 'id3'],
                  columns: {
                    id2: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id3: expect.objectContaining({
                      operationType: 'avg',
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
                  columnId: 'id3',
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
              fields: [
                {
                  name: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],
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
                      operationType: 'avg',
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

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = getDatasourceSuggestionsForField(stateWithEmptyLayer(), '1', {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id1', 'id2'],
                  columns: {
                    id1: expect.objectContaining({
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
                  columnId: 'id1',
                }),
                expect.objectContaining({
                  columnId: 'id2',
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
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id1', 'id2'],
                  columns: {
                    id1: expect.objectContaining({
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
                  columnId: 'id1',
                }),
                expect.objectContaining({
                  columnId: 'id2',
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
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['id1', 'id2'],
                  columns: {
                    id1: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    id2: expect.objectContaining({
                      operationType: 'avg',
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
                  columnId: 'id1',
                }),
                expect.objectContaining({
                  columnId: 'id2',
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
              fields: [
                {
                  name: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],
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
                      operationType: 'avg',
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
                  operationType: 'avg',
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
                    label: 'date histogram of timestamp',
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
                    operationType: 'avg',
                  },
                },
              },
            },
          },
          '1',
          {
            name: 'start_date',
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
                  columnOrder: ['id1', 'colb'],
                  columns: {
                    id1: expect.objectContaining({
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
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'timestamp',
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
                  columnOrder: ['cola', 'id1', 'colb'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    id1: expect.objectContaining({
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
                  columnId: 'id1',
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
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'dest',
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
                  columnOrder: ['cola', 'id1', 'colb'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    id1: expect.objectContaining({
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

      it('replaces a metric column on a number field if only one other metric is already set', () => {
        const initialState = stateWithNonEmptyTables();
        const suggestions = getDatasourceSuggestionsForField(initialState, '1', {
          name: 'memory',
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
                      operationType: 'avg',
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
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            currentLayer: {
              ...initialState.layers.currentLayer,
              columns: {
                cola: initialState.layers.currentLayer.columns.cola,
              },
              columnOrder: ['cola'],
            },
          },
        };
        const suggestions = getDatasourceSuggestionsForField(modifiedState, '1', {
          name: 'memory',
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
                  columnOrder: ['cola', 'id1'],
                  columns: {
                    ...modifiedState.layers.currentLayer.columns,
                    id1: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'memory',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });

      it('adds a metric column on a number field if 2 or more other metric', () => {
        const initialState = stateWithNonEmptyTables();
        const modifiedState: IndexPatternPrivateState = {
          ...initialState,
          layers: {
            ...initialState.layers,
            currentLayer: {
              ...initialState.layers.currentLayer,
              columns: {
                ...initialState.layers.currentLayer.columns,
                colc: {
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: 'dest',
                  label: 'Unique count of dest',
                  operationType: 'cardinality',
                },
              },
              columnOrder: ['cola', 'colb', 'colc'],
            },
          },
        };
        const suggestions = getDatasourceSuggestionsForField(modifiedState, '1', {
          name: 'memory',
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
                  columnOrder: ['cola', 'colb', 'colc', 'id1'],
                  columns: {
                    ...modifiedState.layers.currentLayer.columns,
                    id1: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'memory',
                    }),
                  },
                }),
              },
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
                  columnOrder: ['id1', 'id2'],
                  columns: {
                    id1: expect.objectContaining({
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
                  columnId: 'id1',
                }),
                expect.objectContaining({
                  columnId: 'id2',
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
                  columnOrder: ['id1', 'id2'],
                  columns: {
                    id1: expect.objectContaining({
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
                dataType: 'string',
                isBucketed: true,

                // Private
                operationType: 'terms',
                sourceField: 'op',
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
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      };

      expect(getDatasourceSuggestionsFromCurrentState(state)).toContainEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'extended',
            label: 'Over time',
            columns: [
              {
                columnId: 'id1',
                operation: {
                  label: 'timestamp',
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
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      };

      expect(getDatasourceSuggestionsFromCurrentState(state)).toContainEqual(
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
                  label: 'timestamp',
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
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
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
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            fields: [
              {
                name: 'field1',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field3',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field4',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field5',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          },
        },
        isFirstExistenceFetch: false,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              col1: {
                label: 'My Op',
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
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field4',
              },
              col5: {
                label: 'My Op',
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
      // 1 bucket col, 2 metric cols
      isTableWithBucketColumns(suggestions[0], ['col1', 'col4', 'col5'], 1);

      // 1 bucket col, 1 metric col
      isTableWithBucketColumns(suggestions[1], ['col1', 'col4'], 1);

      // 2 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[2], ['col1', 'col2', 'col4', 'col5'], 2);

      // 2 bucket cols, 1 metric col
      isTableWithBucketColumns(suggestions[3], ['col1', 'col2', 'col4'], 2);

      // 3 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[4], ['col1', 'col2', 'col3', 'col4', 'col5'], 3);

      // 3 bucket cols, 1 metric col
      isTableWithBucketColumns(suggestions[5], ['col1', 'col2', 'col3', 'col4'], 3);

      // first metric col
      isTableWithMetricColumns(suggestions[6], ['col4']);

      // second metric col
      isTableWithMetricColumns(suggestions[7], ['col5']);

      expect(suggestions.length).toBe(8);
    });

    it('returns an only metric version of a given table', () => {
      const initialState = testInitialState();
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            fields: [
              {
                name: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
            ],
          },
        },
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
                sourceField: 'field2',
                params: {
                  interval: 'd',
                },
              },
              id2: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field1',
              },
            },
            columnOrder: ['id1', 'id2'],
          },
        },
      };

      const suggestions = getDatasourceSuggestionsFromCurrentState(state);
      expect(suggestions[1].table.columns[0].operation.label).toBe('Average of field1');
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
            fields: [
              {
                name: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
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

                operationType: 'avg',
                sourceField: 'field1',
              },
            },
            columnOrder: ['id1'],
          },
        },
      };

      const suggestions = getDatasourceSuggestionsFromCurrentState(state);
      expect(suggestions[0].table.columns.length).toBe(1);
      expect(suggestions[0].table.columns[0].operation.label).toBe('Sum of field1');
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
                sourceField: 'field2',
                params: {
                  interval: 'd',
                },
              },
              id2: {
                label: 'Top 5',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field1',
                params: { size: 5, orderBy: { type: 'alphabetical' }, orderDirection: 'asc' },
              },
              id3: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field1',
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
