/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from 'src/plugins/data/public';
import {
  switchDatasource,
  switchVisualization,
  setState,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
} from '.';
import { makeLensStore, defaultState } from '../mocks';

describe('lensSlice', () => {
  const { store } = makeLensStore({});
  const customQuery = { query: 'custom' } as Query;

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
    it('should update the layer state with passed in reducer', () => {
      const newDatasourceState = {};
      store.dispatch(
        updateDatasourceState({
          datasourceId: 'testDatasource',
          updater: newDatasourceState,
        })
      );
      expect(store.getState().lens.datasourceStates.testDatasource.state).toStrictEqual(
        newDatasourceState
      );
    });
    it('should should switch active visualization', () => {
      const newVisState = {};
      store.dispatch(
        switchVisualization({
          suggestion: {
            newVisualizationId: 'testVis2',
            visualizationState: newVisState,
          },
          clearStagedPreview: true,
        })
      );

      expect(store.getState().lens.visualization.state).toBe(newVisState);
    });

    it('should should switch active visualization and update datasource state', () => {
      const newVisState = {};
      const newDatasourceState = {};

      store.dispatch(
        switchVisualization({
          suggestion: {
            newVisualizationId: 'testVis2',
            visualizationState: newVisState,
            datasourceState: newDatasourceState,
            datasourceId: 'testDatasource',
          },
          clearStagedPreview: true,
        })
      );

      expect(store.getState().lens.visualization.state).toBe(newVisState);
      expect(store.getState().lens.datasourceStates.testDatasource.state).toBe(newDatasourceState);
    });

    it('should switch active datasource and initialize new state', () => {
      store.dispatch(
        switchDatasource({
          newDatasourceId: 'testDatasource2',
        })
      );

      expect(store.getState().lens.activeDatasourceId).toEqual('testDatasource2');
      expect(store.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(true);
    });

    it('not initialize already initialized datasource on switch', () => {
      const datasource2State = {};
      const { store: customStore } = makeLensStore({
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
            testDatasource2: {
              state: datasource2State,
              isLoading: false,
            },
          },
        },
      });

      customStore.dispatch(
        switchDatasource({
          newDatasourceId: 'testDatasource2',
        })
      );

      expect(customStore.getState().lens.activeDatasourceId).toEqual('testDatasource2');
      expect(customStore.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(false);
      expect(customStore.getState().lens.datasourceStates.testDatasource2.state).toBe(
        datasource2State
      );
    });
  });
});
