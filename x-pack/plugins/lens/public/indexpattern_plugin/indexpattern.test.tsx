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
        shallow(<IndexPatternDataPanel state={state} setState={() => {}} />)
      ).toMatchSnapshot();
    });

    it('should call setState when the index pattern is switched', async () => {
      const setState = jest.fn();

      const wrapper = shallow(<IndexPatternDataPanel {...{ state, setState }} />);

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
            state={state}
            setState={() => {}}
            filterOperations={(operation: Operation) => true}
          />
        );

        expect(wrapper).toMatchSnapshot();
      });
    });
  });
});
