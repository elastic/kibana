/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatternDatasource, IndexPatternPersistedState } from './indexpattern';
import { DatasourcePublicAPI, Operation } from '../types';

describe('IndexPattern Data Source', () => {
  let persistedState: IndexPatternPersistedState;

  beforeEach(() => {
    persistedState = {
      currentIndexPattern: '',
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
        currentIndexPattern: '',
        indexPatterns: {},
        columns: {},
        columnOrder: [],
      });
    });

    it('should initialize from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);

      expect(state).toEqual({
        ...persistedState,
        indexPatterns: {},
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
  });
});
