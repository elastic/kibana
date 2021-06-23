/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from 'src/plugins/data/public';
import { makeLensStore, defaultState } from '../mocks';
import { lensSlice } from './lens_slice';

const {
  setState,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  // updateLayer,
  // switchVisualization,
  // selectSuggestion,
  // rollbackSuggestion,
  // submitSuggestion,
  // switchDatasource,
  // setToggleFullscreen,
} = lensSlice.actions;

describe('lensSlice', () => {
  const store = makeLensStore({});
  const customQuery = { query: 'custom' } as Query;

  // TODO: need to move some initialization logic from mounter
  // describe('initialization', () => {
  // })

  describe('state update', () => {
    it('setState: updates state ', () => {
      const lensState = store.getState().lens;
      expect(lensState).toEqual(defaultState);
      store.dispatch(setState({ query: customQuery }));
      const changedState = store.getState().lens;
      expect(changedState).toEqual({ ...defaultState, query: customQuery });
    });

    it('updateState: updates state with updater', () => {
      const customUpdater = jest.fn((state) => ({ ...state, query: customQuery }));
      store.dispatch(updateState({ subType: 'UPDATE', updater: customUpdater }));
      const changedState = store.getState().lens;
      expect(changedState).toEqual({ ...defaultState, query: customQuery });
    });
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      store.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          updater: newVisState,
        })
      );

      expect(store.getState().lens.visualization.state).toBe(newVisState);
    });
    it('should update the datasource state with passed in reducer', () => {
      const datasourceUpdater = jest.fn(() => ({ changed: true }));
      store.dispatch(
        updateDatasourceState({
          datasourceId: 'testDatasource',
          updater: datasourceUpdater,
        })
      );
      expect(store.getState().lens.datasourceStates.testDatasource.state).toStrictEqual({
        changed: true,
      });
      expect(datasourceUpdater).toHaveBeenCalledTimes(1);
    });
  });
});
