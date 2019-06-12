/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import {
  getIndexPatternDatasource,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternDataPanel,
} from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';
import { createMockedDragDropContext } from './mocks';

jest.mock('./loader');

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
        name: 'bytes',
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

describe('IndexPattern Data Source', () => {
  let persistedState: IndexPatternPersistedState;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    // @ts-ignore
    indexPatternDatasource = getIndexPatternDatasource();

    persistedState = {
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'My Op',
          dataType: 'string',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'op',
        },
      },
    };
  });

  describe('#initialize', () => {
    it('should load a default state', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(state).toEqual({
        currentIndexPatternId: '1',
        indexPatterns: expectedIndexPatterns,
        columns: {},
        columnOrder: [],
      });
    });

    it('should initialize from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);
      expect(state).toEqual({
        ...persistedState,
        indexPatterns: expectedIndexPatterns,
      });
    });
  });

  describe('#renderDataPanel', () => {
    let state: IndexPatternPrivateState;

    beforeEach(async () => {
      state = await indexPatternDatasource.initialize(persistedState);
    });

    it('should match snapshot', () => {
      expect(
        shallow(
          <IndexPatternDataPanel
            dragDropContext={createMockedDragDropContext()}
            state={state}
            setState={() => {}}
          />
        )
      ).toMatchSnapshot();
    });

    it('should call setState when the index pattern is switched', async () => {
      const setState = jest.fn();

      const wrapper = shallow(
        <IndexPatternDataPanel
          dragDropContext={createMockedDragDropContext()}
          {...{ state, setState }}
        />
      );

      const comboBox = wrapper.find(EuiComboBox);

      comboBox.prop('onChange')!([
        {
          label: expectedIndexPatterns['2'].title,
          value: '2',
        },
      ]);

      expect(setState).toHaveBeenCalledWith({
        ...state,
        currentIndexPatternId: '2',
      });
    });
  });

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);

      expect(indexPatternDatasource.getPersistableState(state)).toEqual(persistedState);
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(indexPatternDatasource.toExpression(state)).toEqual(null);
    });

    it('should generate an expression for a values query', async () => {
      const queryPersistedState: IndexPatternPersistedState = {
        currentIndexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'My Op',
            dataType: 'string',
            isBucketed: false,

            // Private
            operationType: 'value',
            sourceField: 'source',
          },
          col2: {
            operationId: 'op2',
            label: 'My Op 2',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'value',
            sourceField: 'bytes',
          },
        },
      };
      const state = await indexPatternDatasource.initialize(queryPersistedState);
      expect(indexPatternDatasource.toExpression(state)).toMatchInlineSnapshot(
        `"esdocs index=\\"my-fake-index-pattern\\" fields=\\"source, bytes\\" sort=\\"source, DESC\\" | lens_rename_columns idMap='{\\"source\\":\\"col1\\",\\"bytes\\":\\"col2\\"}'"`
      );
    });

    it('should generate an expression for an aggregated query', async () => {
      const queryPersistedState: IndexPatternPersistedState = {
        currentIndexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Count of Documents',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'count',
            sourceField: 'document',
          },
          col2: {
            operationId: 'op2',
            label: 'Date',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
          },
        },
      };
      const state = await indexPatternDatasource.initialize(queryPersistedState);
      expect(indexPatternDatasource.toExpression(state)).toMatchInlineSnapshot(`
"esaggs
      index=\\"1\\"
      metricsAtAllLevels=\\"false\\"
      partialRows=\\"false\\"
      aggConfigs='[{\\"id\\":\\"col1\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}},{\\"id\\":\\"col2\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"timestamp\\",\\"timeRange\\":{\\"from\\":\\"now-1d\\",\\"to\\":\\"now\\"},\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"1h\\",\\"drop_partials\\":false,\\"min_doc_count\\":1,\\"extended_bounds\\":{}}}]' | lens_rename_columns idMap='{\\"col-0-col1\\":\\"col1\\",\\"col-1-col2\\":\\"col2\\"}'"
`);
    });
  });

  describe('#getDatasourceSuggestionsForField', () => {
    describe('with no previous selections', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          columnOrder: [],
          columns: {},
        });
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                operationType: 'terms',
                sourceField: 'source',
              }),
              col2: expect.objectContaining({
                operationType: 'count',
                sourceField: 'documents',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                operationType: 'date_histogram',
                sourceField: 'timestamp',
              }),
              col2: expect.objectContaining({
                operationType: 'count',
                sourceField: 'documents',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                sourceField: 'timestamp',
                operationType: 'date_histogram',
              }),
              col2: expect.objectContaining({
                sourceField: 'bytes',
                operationType: 'sum',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });
    });

    describe('with a prior column', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize(persistedState);
      });

      it('should not suggest for string', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'source',
            type: 'string',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });

      it('should not suggest for date', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'timestamp',
            type: 'date',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });

      it('should not suggest for number', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });
    });
  });

  describe('#getPublicAPI', () => {
    let publicAPI: DatasourcePublicAPI;

    beforeEach(async () => {
      const initialState = await indexPatternDatasource.initialize(persistedState);
      publicAPI = indexPatternDatasource.getPublicAPI(initialState, () => {});
    });

    describe('getTableSpec', () => {
      it('should include col1', () => {
        expect(publicAPI.getTableSpec()).toEqual([
          {
            columnId: 'col1',
          },
        ]);
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          id: 'op1',
          label: 'My Op',
          dataType: 'string',
          isBucketed: false,
        } as Operation);
      });
    });
  });
});
