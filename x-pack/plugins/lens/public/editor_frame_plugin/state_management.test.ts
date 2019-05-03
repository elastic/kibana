/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInitialState, reducer } from './state_management';
import { EditorFrameProps } from './editor_frame';
import { Datasource, Visualization } from '../types';

describe('editor_frame state management', () => {
  describe('initialization', () => {
    let props: EditorFrameProps;

    beforeEach(() => {
      props = {
        datasources: { testDatasource: ({} as unknown) as Datasource },
        visualizations: { testVis: ({ initialize: jest.fn() } as unknown) as Visualization },
        initialDatasource: 'testDatasource',
        initialVisualization: 'testVis',
      };
    });

    it('should store initial datasource and visualization', () => {
      expect(getInitialState(props)).toEqual(
        expect.objectContaining({
          activeDatasource: 'testDatasource',
          activeVisualization: 'testVis',
        })
      );
    });

    it('should initialize visualization', () => {
      const initialVisState = {};
      props.visualizations.testVis.initialize = jest.fn(() => initialVisState);

      const initialState = getInitialState(props);

      expect(initialState.visualizationState.testVis).toBe(initialVisState);
      expect(props.visualizations.testVis.initialize).toHaveBeenCalled();
    });

    it('should not initialize visualization if no initial visualization is passed in', () => {
      const initialState = getInitialState({ ...props, initialVisualization: null });

      expect(initialState.visualizationState).toEqual({});
      expect(props.visualizations.testVis.initialize).not.toHaveBeenCalled();
    });
  });

  describe('state update', () => {
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      const newState = reducer(
        {
          activeDatasource: 'testDatasource',
          activeVisualization: 'testVis',
          datasourceIsLoading: false,
          datasourceState: {},
          visualizationState: {
            testVis: {},
          },
        },
        {
          type: 'UPDATE_VISUALIZATION_STATE',
          newState: newVisState,
        }
      );

      expect(newState.visualizationState).toEqual({
        testVis: newVisState,
      });
    });

    it('should update the datasource state on update', () => {
      const newDatasourceState = {};
      const newState = reducer(
        {
          activeDatasource: 'testDatasource',
          activeVisualization: 'testVis',
          datasourceIsLoading: false,
          datasourceState: {},
          visualizationState: {
            testVis: {},
          },
        },
        {
          type: 'UPDATE_DATASOURCE_STATE',
          newState: newDatasourceState,
        }
      );

      expect(newState.datasourceState).toBe(newDatasourceState);
    });

    it('should should switch active visualization but dont loose old state', () => {
      const testVisState = {};
      const newVisState = {};
      const newState = reducer(
        {
          activeDatasource: 'testDatasource',
          activeVisualization: 'testVis',
          datasourceIsLoading: false,
          datasourceState: {},
          visualizationState: {
            testVis: testVisState,
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisulizationId: 'testVis2',
          initialState: newVisState
        }
      );

      expect(newState.visualizationState.testVis).toBe(testVisState);
      expect(newState.visualizationState.testVis2).toBe(newVisState);
    });

    it('should should switch active datasource and purge visualization state', () => {
      const newState = reducer(
        {
          activeDatasource: 'testDatasource',
          activeVisualization: 'testVis',
          datasourceIsLoading: false,
          datasourceState: {},
          visualizationState: {
            testVis: {},
          },
        },
        {
          type: 'SWITCH_DATASOURCE',
          newDatasourceId: 'testDatasource2'
        }
      );

      expect(newState.visualizationState).toEqual({});
      expect(newState.activeVisualization).toBe(null);
      expect(newState.activeDatasource).toBe('testDatasource2');
      expect(newState.datasourceState).toBe(null);
    });
  });
});
