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
  IndexPatternDimensionPanel,
} from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';

jest.mock('./loader');

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'Fake Index Pattern',
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
    title: 'Fake Rollup Pattern',
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
};

const dragDropContext = {
  dragging: undefined,
  setDragging: jest.fn(),
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
            dragDropContext={dragDropContext}
            state={state}
            setState={() => {}}
          />
        )
      ).toMatchSnapshot();
    });

    it('should call setState when the index pattern is switched', async () => {
      const setState = jest.fn();

      const wrapper = shallow(
        <IndexPatternDataPanel dragDropContext={dragDropContext} {...{ state, setState }} />
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
            sourceField: 'op',
          },
          col2: {
            operationId: 'op2',
            label: 'My Op 2',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'value',
            sourceField: 'op2',
          },
        },
      };
      const state = await indexPatternDatasource.initialize(queryPersistedState);
      expect(indexPatternDatasource.toExpression(state)).toMatchInlineSnapshot(
        `"esdocs index=\\"1\\" fields=\\"op, op2\\" sort=\\"op, DESC\\""`
      );
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

    describe('renderDimensionPanel', () => {
      let state: IndexPatternPrivateState;

      beforeEach(async () => {
        state = await indexPatternDatasource.initialize(persistedState);
      });

      it('should render a dimension panel', () => {
        const wrapper = shallow(
          <IndexPatternDimensionPanel
            dragDropContext={dragDropContext}
            state={state}
            setState={() => {}}
            columnId={'col2'}
            filterOperations={(operation: Operation) => true}
          />
        );

        expect(wrapper).toMatchSnapshot();
      });

      it('should call the filterOperations function', () => {
        const filterOperations = jest.fn().mockReturnValue(true);

        shallow(
          <IndexPatternDimensionPanel
            dragDropContext={dragDropContext}
            state={state}
            setState={() => {}}
            columnId={'col2'}
            filterOperations={filterOperations}
          />
        );

        expect(filterOperations).toBeCalledTimes(3);
      });

      it('should filter out all selections if the filter returns false', () => {
        const wrapper = shallow(
          <IndexPatternDimensionPanel
            dragDropContext={dragDropContext}
            state={state}
            setState={() => {}}
            columnId={'col2'}
            filterOperations={() => false}
          />
        );

        expect(wrapper.find(EuiComboBox)!.prop('options')!.length).toEqual(0);
      });

      it('should update the datasource state on selection', () => {
        const setState = jest.fn();

        const wrapper = shallow(
          <IndexPatternDimensionPanel
            dragDropContext={dragDropContext}
            state={state}
            setState={setState}
            columnId={'col2'}
            filterOperations={() => true}
          />
        );

        const comboBox = wrapper.find(EuiComboBox)!;
        const firstOption = comboBox.prop('options')![0];

        comboBox.prop('onChange')!([firstOption]);

        expect(setState).toHaveBeenCalledWith({
          ...state,
          columns: {
            ...state.columns,
            col2: {
              operationId: firstOption.value,
              label: 'Value of timestamp',
              dataType: 'date',
              isBucketed: false,
              operationType: 'value',
              sourceField: 'timestamp',
            },
          },
          columnOrder: ['col1', 'col2'],
        });
      });
    });
  });
});
