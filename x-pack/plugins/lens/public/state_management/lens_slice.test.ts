/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnhancedStore } from '@reduxjs/toolkit';
import { Query } from 'src/plugins/data/public';
import {
  switchDatasource,
  switchVisualization,
  setState,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  removeOrClearLayer,
  addLayer,
  LensRootStore,
  selectTriggerApplyChanges,
  selectChangesApplied,
} from '.';
import { layerTypes } from '../../common';
import { makeLensStore, defaultState, mockStoreDeps } from '../mocks';
import { DatasourceMap, VisualizationMap } from '../types';
import { applyChanges, disableAutoApply, enableAutoApply, setChangesApplied } from './lens_slice';
import { LensAppState } from './types';

describe('lensSlice', () => {
  let store: EnhancedStore<{ lens: LensAppState }>;
  beforeEach(() => {
    store = makeLensStore({}).store;
  });
  const customQuery = { query: 'custom' } as Query;

  describe('state update', () => {
    it('setState: updates state ', () => {
      const lensState = store.getState().lens;
      expect(lensState).toEqual(defaultState);
      store.dispatch(setState({ query: customQuery }));
      const changedState = store.getState().lens;
      expect(changedState).toEqual({ ...defaultState, query: customQuery });
    });

    describe('auto-apply-related actions', () => {
      it('should disable auto apply', () => {
        expect(store.getState().lens.autoApplyDisabled).toBeUndefined();
        expect(store.getState().lens.changesApplied).toBeUndefined();

        store.dispatch(disableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(true);
        expect(store.getState().lens.changesApplied).toBe(true);
      });

      it('should enable auto-apply', () => {
        store.dispatch(disableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(true);

        store.dispatch(enableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(false);
      });

      it('applies changes when auto-apply disabled', () => {
        store.dispatch(disableAutoApply());

        store.dispatch(applyChanges());

        expect(selectTriggerApplyChanges(store.getState())).toBe(true);
      });

      it('does not apply changes if auto-apply enabled', () => {
        expect(store.getState().lens.autoApplyDisabled).toBeUndefined();

        store.dispatch(applyChanges());

        expect(selectTriggerApplyChanges(store.getState())).toBe(false);
      });

      it('sets changes-applied flag', () => {
        expect(store.getState().lens.changesApplied).toBeUndefined();

        store.dispatch(setChangesApplied(true));

        expect(selectChangesApplied(store.getState())).toBe(true);

        store.dispatch(setChangesApplied(false));

        expect(selectChangesApplied(store.getState())).toBe(true);
      });
    });

    it('updateState: updates state with updater', () => {
      const customUpdater = jest.fn((state) => ({ ...state, query: customQuery }));
      store.dispatch(updateState({ updater: customUpdater }));
      const changedState = store.getState().lens;
      expect(changedState).toEqual({ ...defaultState, query: customQuery });
    });
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      store.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          newState: newVisState,
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

    it('should not initialize already initialized datasource on switch', () => {
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

    describe('adding or removing layer', () => {
      const testDatasource = (datasourceId: string) => {
        return {
          id: datasourceId,
          getPublicAPI: () => ({
            datasourceId: 'testDatasource',
            getOperationForColumnId: jest.fn(),
            getTableSpec: jest.fn(),
          }),
          getLayers: () => ['layer1'],
          clearLayer: (layerIds: unknown, layerId: string) =>
            (layerIds as string[]).map((id: string) =>
              id === layerId ? `${datasourceId}_clear_${layerId}` : id
            ),
          removeLayer: (layerIds: unknown, layerId: string) =>
            (layerIds as string[]).filter((id: string) => id !== layerId),
          insertLayer: (layerIds: unknown, layerId: string) => [...(layerIds as string[]), layerId],
        };
      };
      const datasourceStates = {
        testDatasource: {
          isLoading: false,
          state: ['layer1'],
        },
        testDatasource2: {
          isLoading: false,
          state: ['layer2'],
        },
      };
      const datasourceMap = {
        testDatasource: testDatasource('testDatasource'),
        testDatasource2: testDatasource('testDatasource2'),
      };
      const visualizationMap = {
        testVis: {
          clearLayer: (layerIds: unknown, layerId: string) =>
            (layerIds as string[]).map((id: string) =>
              id === layerId ? `vis_clear_${layerId}` : id
            ),
          removeLayer: (layerIds: unknown, layerId: string) =>
            (layerIds as string[]).filter((id: string) => id !== layerId),
          getLayerIds: (layerIds: unknown) => layerIds as string[],
          appendLayer: (layerIds: unknown, layerId: string) => [...(layerIds as string[]), layerId],
          getSupportedLayers: jest.fn(() => [{ type: layerTypes.DATA, label: 'Data Layer' }]),
        },
      };

      let customStore: LensRootStore;
      beforeEach(() => {
        customStore = makeLensStore({
          preloadedState: {
            activeDatasourceId: 'testDatasource',
            datasourceStates,
            visualization: {
              activeId: 'testVis',
              state: ['layer1', 'layer2'],
            },
            stagedPreview: {
              visualization: {
                activeId: 'testVis',
                state: ['layer1', 'layer2'],
              },
              datasourceStates,
            },
          },
          storeDeps: mockStoreDeps({
            visualizationMap: visualizationMap as unknown as VisualizationMap,
            datasourceMap: datasourceMap as unknown as DatasourceMap,
          }),
        }).store;
      });

      it('addLayer: should add the layer to the datasource and visualization', () => {
        customStore.dispatch(
          addLayer({
            layerId: 'foo',
            layerType: layerTypes.DATA,
          })
        );
        const state = customStore.getState().lens;

        expect(state.visualization.state).toEqual(['layer1', 'layer2', 'foo']);
        expect(state.datasourceStates.testDatasource.state).toEqual(['layer1', 'foo']);
        expect(state.datasourceStates.testDatasource2.state).toEqual(['layer2']);
        expect(state.stagedPreview).not.toBeDefined();
      });

      it('removeLayer: should remove the layer if it is not the only layer', () => {
        customStore.dispatch(
          removeOrClearLayer({
            visualizationId: 'testVis',
            layerId: 'layer1',
            layerIds: ['layer1', 'layer2'],
          })
        );
        const state = customStore.getState().lens;

        expect(state.visualization.state).toEqual(['layer2']);
        expect(state.datasourceStates.testDatasource.state).toEqual([]);
        expect(state.datasourceStates.testDatasource2.state).toEqual(['layer2']);
        expect(state.stagedPreview).not.toBeDefined();
      });
    });
  });
});
