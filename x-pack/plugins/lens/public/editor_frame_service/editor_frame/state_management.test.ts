/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInitialState, reducer } from './state_management';
import { EditorFrameProps } from './index';
import { Datasource, Visualization } from '../../types';
import { createExpressionRendererMock } from '../mocks';
import { coreMock } from 'src/core/public/mocks';
import { uiActionsPluginMock } from '../../../../../../src/plugins/ui_actions/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { expressionsPluginMock } from '../../../../../../src/plugins/expressions/public/mocks';

describe('editor_frame state management', () => {
  describe('initialization', () => {
    let props: EditorFrameProps;

    beforeEach(() => {
      props = {
        onError: jest.fn(),
        datasourceMap: { testDatasource: ({} as unknown) as Datasource },
        visualizationMap: { testVis: ({ initialize: jest.fn() } as unknown) as Visualization },
        initialDatasourceId: 'testDatasource',
        initialVisualizationId: 'testVis',
        ExpressionRenderer: createExpressionRendererMock(),
        onChange: jest.fn(),
        core: coreMock.createSetup(),
        plugins: {
          uiActions: uiActionsPluginMock.createStartContract(),
          data: dataPluginMock.createStartContract(),
          expressions: expressionsPluginMock.createStartContract(),
        },
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
        query: { query: '', language: 'lucene' },
        filters: [],
        showNoDataPopover: jest.fn(),
      };
    });

    it('should store initial datasource and visualization', () => {
      const initialState = getInitialState(props);
      expect(initialState.activeDatasourceId).toEqual('testDatasource');
      expect(initialState.visualization.activeId).toEqual('testVis');
    });

    it('should not initialize visualization but set active id', () => {
      const initialState = getInitialState(props);

      expect(initialState.visualization.state).toBe(null);
      expect(initialState.visualization.activeId).toBe('testVis');
      expect(props.visualizationMap.testVis.initialize).not.toHaveBeenCalled();
    });

    it('should prefill state if doc is passed in', () => {
      const initialState = getInitialState({
        ...props,
        doc: {
          expression: '',
          state: {
            datasourceStates: {
              testDatasource: { internalState1: '' },
              testDatasource2: { internalState2: '' },
            },
            visualization: {},
            datasourceMetaData: {
              filterableIndexPatterns: [],
            },
            query: { query: '', language: 'lucene' },
            filters: [],
          },
          title: '',
          visualizationType: 'testVis',
        },
      });

      expect(initialState.datasourceStates).toMatchInlineSnapshot(`
        Object {
          "testDatasource": Object {
            "isLoading": true,
            "state": Object {
              "internalState1": "",
            },
          },
          "testDatasource2": Object {
            "isLoading": true,
            "state": Object {
              "internalState2": "",
            },
          },
        }
      `);
      expect(initialState.visualization).toMatchInlineSnapshot(`
        Object {
          "activeId": "testVis",
          "state": null,
        }
      `);
    });

    it('should not set active id if no initial visualization is passed in', () => {
      const initialState = getInitialState({ ...props, initialVisualizationId: null });

      expect(initialState.visualization.state).toEqual(null);
      expect(initialState.visualization.activeId).toEqual(null);
      expect(props.visualizationMap.testVis.initialize).not.toHaveBeenCalled();
    });
  });

  describe('state update', () => {
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'aaa',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'UPDATE_VISUALIZATION_STATE',
          visualizationId: 'testVis',
          newState: newVisState,
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
    });

    it('should update the datasource state with passed in reducer', () => {
      const datasourceReducer = jest.fn(() => ({ changed: true }));
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'bbb',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'UPDATE_DATASOURCE_STATE',
          updater: datasourceReducer,
          datasourceId: 'testDatasource',
        }
      );

      expect(newState.datasourceStates.testDatasource.state).toEqual({ changed: true });
      expect(datasourceReducer).toHaveBeenCalledTimes(1);
    });

    it('should update the layer state with passed in reducer', () => {
      const newDatasourceState = {};
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'bbb',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'UPDATE_DATASOURCE_STATE',
          updater: newDatasourceState,
          datasourceId: 'testDatasource',
        }
      );

      expect(newState.datasourceStates.testDatasource.state).toBe(newDatasourceState);
    });

    it('should should switch active visualization', () => {
      const testVisState = {};
      const newVisState = {};
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'ccc',
          visualization: {
            activeId: 'testVis',
            state: testVisState,
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisualizationId: 'testVis2',
          initialState: newVisState,
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
    });

    it('should should switch active visualization and update datasource state', () => {
      const testVisState = {};
      const newVisState = {};
      const newDatasourceState = {};
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'ddd',
          visualization: {
            activeId: 'testVis',
            state: testVisState,
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisualizationId: 'testVis2',
          initialState: newVisState,
          datasourceState: newDatasourceState,
          datasourceId: 'testDatasource',
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
      expect(newState.datasourceStates.testDatasource.state).toBe(newDatasourceState);
    });

    it('should should switch active datasource and initialize new state', () => {
      const newState = reducer(
        {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'testDatasource',
          title: 'eee',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'SWITCH_DATASOURCE',
          newDatasourceId: 'testDatasource2',
        }
      );

      expect(newState.activeDatasourceId).toEqual('testDatasource2');
      expect(newState.datasourceStates.testDatasource2.isLoading).toEqual(true);
    });

    it('not initialize already initialized datasource on switch', () => {
      const datasource2State = {};
      const newState = reducer(
        {
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
          activeDatasourceId: 'testDatasource',
          title: 'eee',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'SWITCH_DATASOURCE',
          newDatasourceId: 'testDatasource2',
        }
      );

      expect(newState.activeDatasourceId).toEqual('testDatasource2');
      expect(newState.datasourceStates.testDatasource2.state).toBe(datasource2State);
    });

    it('should reset the state', () => {
      const newState = reducer(
        {
          datasourceStates: {
            a: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'a',
          title: 'jjj',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'RESET',
          state: {
            datasourceStates: {
              z: {
                isLoading: false,
                state: { hola: 'muchacho' },
              },
            },
            activeDatasourceId: 'z',
            persistedId: 'bar',
            title: 'lll',
            visualization: {
              activeId: 'q',
              state: { my: 'viz' },
            },
          },
        }
      );

      expect(newState).toMatchObject({
        datasourceStates: {
          z: {
            isLoading: false,
            state: { hola: 'muchacho' },
          },
        },
        activeDatasourceId: 'z',
        persistedId: 'bar',
        visualization: {
          activeId: 'q',
          state: { my: 'viz' },
        },
      });
    });

    it('should load the state from the doc', () => {
      const newState = reducer(
        {
          datasourceStates: {
            a: {
              state: {},
              isLoading: false,
            },
          },
          activeDatasourceId: 'a',
          title: 'mmm',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'VISUALIZATION_LOADED',
          doc: {
            id: 'b',
            expression: '',
            state: {
              datasourceMetaData: { filterableIndexPatterns: [] },
              datasourceStates: { a: { foo: 'c' } },
              visualization: { bar: 'd' },
              query: { query: '', language: 'lucene' },
              filters: [],
            },
            title: 'heyo!',
            description: 'My lens',
            type: 'lens',
            visualizationType: 'line',
          },
        }
      );

      expect(newState).toEqual({
        activeDatasourceId: 'a',
        datasourceStates: {
          a: {
            isLoading: true,
            state: {
              foo: 'c',
            },
          },
        },
        persistedId: 'b',
        title: 'heyo!',
        description: 'My lens',
        visualization: {
          activeId: 'line',
          state: {
            bar: 'd',
          },
        },
      });
    });
  });
});
