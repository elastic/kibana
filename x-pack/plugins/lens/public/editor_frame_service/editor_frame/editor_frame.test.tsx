/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { EuiPanel, EuiToolTip } from '@elastic/eui';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { EditorFrame } from './editor_frame';
import { DatasourcePublicAPI, DatasourceSuggestion, Visualization } from '../../types';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
} from '../mocks';
import { ReactExpressionRendererType } from 'src/plugins/expressions/public';
import { DragDrop } from '../../drag_drop';
import { FrameLayout } from './frame_layout';
import { uiActionsPluginMock } from '../../../../../../src/plugins/ui_actions/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { expressionsPluginMock } from '../../../../../../src/plugins/expressions/public/mocks';

function generateSuggestion(state = {}): DatasourceSuggestion {
  return {
    state,
    table: {
      columns: [],
      isMultiRow: true,
      layerId: 'first',
      changeType: 'unchanged',
    },
    keptLayerIds: ['first'],
  };
}

function getDefaultProps() {
  return {
    store: {
      save: jest.fn(),
      load: jest.fn(),
    },
    redirectTo: jest.fn(),
    onError: jest.fn(),
    onChange: jest.fn(),
    dateRange: { fromDate: '', toDate: '' },
    query: { query: '', language: 'lucene' },
    filters: [],
    core: coreMock.createSetup(),
    plugins: {
      uiActions: uiActionsPluginMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
    },
    showNoDataPopover: jest.fn(),
  };
}

describe('editor_frame', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  let mockVisualization2: jest.Mocked<Visualization>;
  let mockDatasource2: DatasourceMock;

  let expressionRendererMock: ReactExpressionRendererType;

  beforeEach(() => {
    mockVisualization = {
      ...createMockVisualization(),
      id: 'testVis',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis',
          label: 'TEST1',
        },
      ],
    };
    mockVisualization2 = {
      ...createMockVisualization(),
      id: 'testVis2',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis2',
          label: 'TEST2',
        },
      ],
    };

    mockVisualization.getLayerIds.mockReturnValue(['first']);
    mockVisualization2.getLayerIds.mockReturnValue(['second']);

    mockDatasource = createMockDatasource('testDatasource');
    mockDatasource2 = createMockDatasource('testDatasource2');

    expressionRendererMock = createExpressionRendererMock();
  });

  describe('initialization', () => {
    it('should initialize initial datasource', async () => {
      mockVisualization.getLayerIds.mockReturnValue([]);
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockDatasource.initialize).toHaveBeenCalled();
    });

    it('should not initialize datasource and visualization if no initial one is specificed', () => {
      act(() => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId={null}
            initialVisualizationId={null}
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockVisualization.initialize).not.toHaveBeenCalled();
      expect(mockDatasource.initialize).not.toHaveBeenCalled();
    });

    it('should initialize all datasources with state from doc', async () => {
      const mockDatasource3 = createMockDatasource('testDatasource3');
      const datasource1State = { datasource1: '' };
      const datasource2State = { datasource2: '' };

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
              testDatasource3: mockDatasource3,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            doc={{
              visualizationType: 'testVis',
              title: '',
              state: {
                datasourceStates: {
                  testDatasource: datasource1State,
                  testDatasource2: datasource2State,
                },
                visualization: {},
                query: { query: '', language: 'lucene' },
                filters: [],
              },
              references: [],
            }}
          />
        );
      });
      expect(mockDatasource.initialize).toHaveBeenCalledWith(datasource1State, []);
      expect(mockDatasource2.initialize).toHaveBeenCalledWith(datasource2State, []);
      expect(mockDatasource3.initialize).not.toHaveBeenCalled();
    });

    it('should not render something before all datasources are initialized', async () => {
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
        expect(mockDatasource.renderDataPanel).not.toHaveBeenCalled();
      });
      expect(mockDatasource.renderDataPanel).toHaveBeenCalled();
    });

    it('should not initialize visualization before datasource is initialized', async () => {
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
        expect(mockVisualization.initialize).not.toHaveBeenCalled();
      });

      expect(mockVisualization.initialize).toHaveBeenCalled();
    });

    it('should pass the public frame api into visualization initialize', async () => {
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            dateRange={{ fromDate: 'now-7d', toDate: 'now' }}
          />
        );
        expect(mockVisualization.initialize).not.toHaveBeenCalled();
      });

      expect(mockVisualization.initialize).toHaveBeenCalledWith({
        datasourceLayers: {},
        addNewLayer: expect.any(Function),
        removeLayers: expect.any(Function),
        query: { query: '', language: 'lucene' },
        filters: [],
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
      });
    });

    it('should add new layer on active datasource on frame api call', async () => {
      const initialState = { datasource2: '' };
      mockDatasource2.initialize.mockReturnValue(Promise.resolve(initialState));
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource2"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      act(() => {
        mockVisualization.initialize.mock.calls[0][0].addNewLayer();
      });

      expect(mockDatasource2.insertLayer).toHaveBeenCalledWith(initialState, expect.anything());
    });

    it('should remove layer on active datasource on frame api call', async () => {
      const initialState = { datasource2: '' };
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource2.initialize.mockReturnValue(Promise.resolve(initialState));
      mockDatasource2.getLayers.mockReturnValue(['abc', 'def']);
      mockDatasource2.removeLayer.mockReturnValue({ removed: true });
      mockVisualization.getLayerIds.mockReturnValue(['first', 'abc', 'def']);
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource2"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      act(() => {
        mockVisualization.initialize.mock.calls[0][0].removeLayers(['abc', 'def']);
      });

      expect(mockDatasource2.removeLayer).toHaveBeenCalledWith(initialState, 'abc');
      expect(mockDatasource2.removeLayer).toHaveBeenCalledWith({ removed: true }, 'def');
    });

    it('should render data panel after initialization is complete', async () => {
      const initialState = {};
      let databaseInitialized: ({}) => void;

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                initialize: () =>
                  new Promise((resolve) => {
                    databaseInitialized = resolve;
                  }),
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });
      await act(async () => {
        databaseInitialized!(initialState);
      });
      expect(mockDatasource.renderDataPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });

    it('should initialize visualization state and render config panel', async () => {
      const initialState = {};
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: { ...mockVisualization, initialize: () => initialState },
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                initialize: () => Promise.resolve(),
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: initialState })
      );
    });

    let instance: ReactWrapper;

    it('should render the resulting expression using the expression renderer', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: { ...mockVisualization, toExpression: () => 'vis' },
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                toExpression: () => 'datasource',
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      instance.update();

      expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {},
              "function": "kibana",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "layerIds": Array [
                  "first",
                ],
                "tables": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {},
                        "function": "datasource",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
              },
              "function": "lens_merge_tables",
              "type": "function",
            },
            Object {
              "arguments": Object {},
              "function": "vis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    it('should render individual expression for each given layer', async () => {
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource2.toExpression.mockImplementation((_state, layerId) => `datasource_${layerId}`);
      mockDatasource.initialize.mockImplementation((initialState) => Promise.resolve(initialState));
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource2.initialize.mockImplementation((initialState) =>
        Promise.resolve(initialState)
      );
      mockDatasource2.getLayers.mockReturnValue(['second', 'third']);

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: { ...mockVisualization, toExpression: () => 'vis' },
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            doc={{
              visualizationType: 'testVis',
              title: '',
              state: {
                datasourceStates: {
                  testDatasource: {},
                  testDatasource2: {},
                },
                visualization: {},
                query: { query: '', language: 'lucene' },
                filters: [],
              },
              references: [],
            }}
          />
        );
      });

      instance.update();

      expect(instance.find(expressionRendererMock).prop('expression')).toEqual({
        type: 'expression',
        chain: expect.arrayContaining([
          expect.objectContaining({
            arguments: expect.objectContaining({ layerIds: ['first', 'second', 'third'] }),
          }),
        ]),
      });
      expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {},
              "function": "kibana",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "layerIds": Array [
                  "first",
                  "second",
                  "third",
                ],
                "tables": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {},
                        "function": "datasource",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {},
                        "function": "datasource_second",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {},
                        "function": "datasource_third",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
              },
              "function": "lens_merge_tables",
              "type": "function",
            },
            Object {
              "arguments": Object {},
              "function": "vis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });
  });

  describe('state update', () => {
    it('should re-render config panel after state update', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });
      const updatedState = {};
      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;
      act(() => {
        setDatasourceState(updatedState);
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(2);
      expect(mockVisualization.getConfiguration).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render data panel after state update', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      const updatedState = {
        title: 'shazm',
      };
      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;
      act(() => {
        setDatasourceState(updatedState);
      });

      expect(mockDatasource.renderDataPanel).toHaveBeenCalledTimes(2);
      expect(mockDatasource.renderDataPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render config panel with updated datasource api after datasource state update', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      const updatedPublicAPI: DatasourcePublicAPI = {
        datasourceId: 'testDatasource',
        getOperationForColumnId: jest.fn(),
        getTableSpec: jest.fn(),
      };
      mockDatasource.getPublicAPI.mockReturnValue(updatedPublicAPI);

      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;
      act(() => {
        setDatasourceState({});
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(2);
      expect(mockVisualization.getConfiguration).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frame: expect.objectContaining({
            datasourceLayers: {
              first: updatedPublicAPI,
            },
          }),
        })
      );
    });
  });

  describe('datasource public api communication', () => {
    it('should pass the datasource api for each layer to the visualization', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource2.getLayers.mockReturnValue(['second', 'third']);
      mockVisualization.getLayerIds.mockReturnValue(['first', 'second', 'third']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            doc={{
              visualizationType: 'testVis',
              title: '',
              state: {
                datasourceStates: {
                  testDatasource: {},
                  testDatasource2: {},
                },
                visualization: {},
                query: { query: '', language: 'lucene' },
                filters: [],
              },
              references: [],
            }}
          />
        );
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalled();

      const datasourceLayers =
        mockVisualization.getConfiguration.mock.calls[0][0].frame.datasourceLayers;
      expect(datasourceLayers.first).toBe(mockDatasource.publicAPIMock);
      expect(datasourceLayers.second).toBe(mockDatasource2.publicAPIMock);
      expect(datasourceLayers.third).toBe(mockDatasource2.publicAPIMock);
    });

    it('should create a separate datasource public api for each layer', async () => {
      mockDatasource.initialize.mockImplementation((initialState) => Promise.resolve(initialState));
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource2.initialize.mockImplementation((initialState) =>
        Promise.resolve(initialState)
      );
      mockDatasource2.getLayers.mockReturnValue(['second', 'third']);

      const datasource1State = { datasource1: '' };
      const datasource2State = { datasource2: '' };

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            doc={{
              visualizationType: 'testVis',
              title: '',
              state: {
                datasourceStates: {
                  testDatasource: datasource1State,
                  testDatasource2: datasource2State,
                },
                visualization: {},
                query: { query: '', language: 'lucene' },
                filters: [],
              },
              references: [],
            }}
          />
        );
      });

      expect(mockDatasource.getPublicAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          state: datasource1State,
          layerId: 'first',
        })
      );
      expect(mockDatasource2.getPublicAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          state: datasource2State,
          layerId: 'second',
        })
      );
      expect(mockDatasource2.getPublicAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          state: datasource2State,
          layerId: 'third',
        })
      );
    });

    it('should give access to the datasource state in the datasource factory function', async () => {
      const datasourceState = {};
      mockDatasource.initialize.mockResolvedValue(datasourceState);
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockDatasource.getPublicAPI).toHaveBeenCalledWith({
        state: datasourceState,
        layerId: 'first',
      });
    });
  });

  describe('switching', () => {
    let instance: ReactWrapper;

    function switchTo(subType: string) {
      act(() => {
        instance.find('[data-test-subj="lnsChartSwitchPopover"]').last().simulate('click');
      });

      instance.update();

      act(() => {
        instance
          .find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`)
          .last()
          .simulate('click');
      });
    }

    beforeEach(async () => {
      mockDatasource.getLayers.mockReturnValue(['first', 'second']);
      mockDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
        {
          state: {},
          table: {
            columns: [],
            isMultiRow: true,
            layerId: 'first',
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
              testVis2: mockVisualization2,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // necessary to flush elements to dom synchronously
      instance.update();
    });

    afterEach(() => {
      instance.unmount();
    });

    it('should have initialized only the initial datasource and visualization', () => {
      expect(mockDatasource.initialize).toHaveBeenCalled();
      expect(mockDatasource2.initialize).not.toHaveBeenCalled();

      expect(mockVisualization.initialize).toHaveBeenCalled();
      expect(mockVisualization2.initialize).not.toHaveBeenCalled();
    });

    it('should initialize other datasource on switch', async () => {
      await act(async () => {
        instance.find('button[data-test-subj="datasource-switch"]').simulate('click');
      });
      await act(async () => {
        (document.querySelector(
          '[data-test-subj="datasource-switch-testDatasource2"]'
        ) as HTMLButtonElement).click();
      });
      expect(mockDatasource2.initialize).toHaveBeenCalled();
    });

    it('should call datasource render with new state on switch', async () => {
      const initialState = {};
      mockDatasource2.initialize.mockResolvedValue(initialState);

      instance.find('button[data-test-subj="datasource-switch"]').simulate('click');

      await act(async () => {
        (document.querySelector(
          '[data-test-subj="datasource-switch-testDatasource2"]'
        ) as HTMLButtonElement).click();
      });

      expect(mockDatasource2.renderDataPanel).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ state: initialState })
      );
    });

    it('should initialize other visualization on switch', async () => {
      switchTo('testVis2');
      expect(mockVisualization2.initialize).toHaveBeenCalled();
    });

    it('should use suggestions to switch to new visualization', async () => {
      const initialState = { suggested: true };
      mockVisualization2.initialize.mockReturnValueOnce({ initial: true });
      mockVisualization2.getVisualizationTypeId.mockReturnValueOnce('testVis2');
      mockVisualization2.getSuggestions.mockReturnValueOnce([
        {
          title: 'Suggested vis',
          score: 1,
          state: initialState,
          previewIcon: 'empty',
        },
      ]);

      switchTo('testVis2');

      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.initialize).toHaveBeenCalledWith(expect.anything(), initialState);
      expect(mockVisualization2.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: { initial: true } })
      );
    });

    it('should fall back when switching visualizations if the visualization has no suggested use', async () => {
      mockVisualization2.initialize.mockReturnValueOnce({ initial: true });

      switchTo('testVis2');

      expect(mockDatasource.publicAPIMock.getTableSpec).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          datasourceLayers: expect.objectContaining({ first: mockDatasource.publicAPIMock }),
        }),
        undefined
      );
      expect(mockVisualization2.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: { initial: true } })
      );
    });
  });

  describe('suggestions', () => {
    it('should fetch suggestions of currently active datasource', async () => {
      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockDatasource.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
      expect(mockDatasource2.getDatasourceSuggestionsFromCurrentState).not.toHaveBeenCalled();
    });

    it('should fetch suggestions of all visualizations', async () => {
      mockDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
        {
          state: {},
          table: {
            changeType: 'unchanged',
            columns: [],
            isMultiRow: true,
            layerId: 'first',
          },
          keptLayerIds: [],
        },
      ]);

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
              testVis2: mockVisualization2,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
              testDatasource2: mockDatasource2,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      expect(mockVisualization.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
    });

    let instance: ReactWrapper;
    it('should display top 5 suggestions in descending order', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.1,
                    state: {},
                    title: 'Suggestion6',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.5,
                    state: {},
                    title: 'Suggestion3',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.7,
                    state: {},
                    title: 'Suggestion2',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.8,
                    state: {},
                    title: 'Suggestion1',
                    previewIcon: 'empty',
                  },
                ],
              },
              testVis2: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.4,
                    state: {},
                    title: 'Suggestion5',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.45,
                    state: {},
                    title: 'Suggestion4',
                    previewIcon: 'empty',
                  },
                ],
              },
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // TODO why is this necessary?
      instance.update();
      expect(
        instance
          .find('[data-test-subj="lnsSuggestion"]')
          .find(EuiPanel)
          .map((el) => el.parents(EuiToolTip).prop('content'))
      ).toEqual([
        'Current',
        'Suggestion1',
        'Suggestion2',
        'Suggestion3',
        'Suggestion4',
        'Suggestion5',
      ]);
    });

    it('should switch to suggested visualization', async () => {
      mockDatasource.getLayers.mockReturnValue(['first', 'second', 'third']);
      const newDatasourceState = {};
      const suggestionVisState = {};

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.8,
                    state: suggestionVisState,
                    title: 'Suggestion1',
                    previewIcon: 'empty',
                  },
                ],
              },
              testVis2: mockVisualization2,
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis2"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find('[data-test-subj="lnsSuggestion"]').at(2).simulate('click');
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(1);
      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
      expect(mockDatasource.renderDataPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: newDatasourceState,
        })
      );
    });

    it('should switch to best suggested visualization on field drop', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);
      const suggestionVisState = {};

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.2,
                    state: {},
                    title: 'Suggestion1',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.8,
                    state: suggestionVisState,
                    title: 'Suggestion2',
                    previewIcon: 'empty',
                  },
                ],
              },
              testVis2: mockVisualization2,
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                getDatasourceSuggestionsForField: () => [generateSuggestion()],
                getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find('[data-test-subj="lnsWorkspace"]').last().simulate('drop');
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });

    it('should use the currently selected visualization if possible on field drop', async () => {
      mockDatasource.getLayers.mockReturnValue(['first', 'second', 'third']);
      const suggestionVisState = {};

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.2,
                    state: {},
                    title: 'Suggestion1',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.6,
                    state: {},
                    title: 'Suggestion2',
                    previewIcon: 'empty',
                  },
                ],
              },
              testVis2: {
                ...mockVisualization2,
                getSuggestions: () => [
                  {
                    score: 0.8,
                    state: suggestionVisState,
                    title: 'Suggestion3',
                    previewIcon: 'empty',
                  },
                ],
              },
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                getDatasourceSuggestionsForField: () => [generateSuggestion()],
                getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
                renderDataPanel: (_element, { dragDropContext: { setDragging, dragging } }) => {
                  if (dragging !== 'draggedField') {
                    setDragging('draggedField');
                  }
                },
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis2"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find(DragDrop).filter('[data-test-subj="mockVisA"]').prop('onDrop')!({
          indexPatternId: '1',
          field: {},
        });
      });

      expect(mockVisualization2.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });

    it('should use the highest priority suggestion available', async () => {
      mockDatasource.getLayers.mockReturnValue(['first', 'second', 'third']);
      const suggestionVisState = {};
      const mockVisualization3 = {
        ...createMockVisualization(),
        id: 'testVis3',
        getLayerIds: () => ['third'],
        visualizationTypes: [
          {
            icon: 'empty',
            id: 'testVis3',
            label: 'TEST3',
          },
        ],
        getSuggestions: () => [
          {
            score: 0.9,
            state: suggestionVisState,
            title: 'Suggestion3',
            previewIcon: 'empty',
          },
          {
            score: 0.7,
            state: {},
            title: 'Suggestion4',
            previewIcon: 'empty',
          },
        ],
      };

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: {
                ...mockVisualization,
                getSuggestions: () => [
                  {
                    score: 0.2,
                    state: {},
                    title: 'Suggestion1',
                    previewIcon: 'empty',
                  },
                  {
                    score: 0.6,
                    state: {},
                    title: 'Suggestion2',
                    previewIcon: 'empty',
                  },
                ],
              },
              testVis2: {
                ...mockVisualization2,
                getSuggestions: () => [],
              },
              testVis3: {
                ...mockVisualization3,
              },
            }}
            datasourceMap={{
              testDatasource: {
                ...mockDatasource,
                getDatasourceSuggestionsForField: () => [generateSuggestion()],
                getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
                renderDataPanel: (_element, { dragDropContext: { setDragging, dragging } }) => {
                  if (dragging !== 'draggedField') {
                    setDragging('draggedField');
                  }
                },
              },
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis2"
            ExpressionRenderer={expressionRendererMock}
          />
        );
      });

      // TODO why is this necessary?
      instance.update();

      act(() => {
        instance.find(DragDrop).filter('[data-test-subj="lnsWorkspace"]').prop('onDrop')!({
          indexPatternId: '1',
          field: {},
        });
      });

      expect(mockVisualization3.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });
  });

  describe('passing state back to the caller', () => {
    let resolver: (value: unknown) => void;
    let instance: ReactWrapper;

    it('should call onChange only when the active datasource is finished loading', async () => {
      const onChange = jest.fn();

      mockDatasource.initialize.mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve;
        })
      );
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource.getPersistableState = jest.fn((x) => ({
        state: x,
        savedObjectReferences: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      }));
      mockVisualization.initialize.mockReturnValue({ initialState: true });

      await act(async () => {
        mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            onChange={onChange}
          />
        );
        expect(onChange).toHaveBeenCalledTimes(0);
        resolver({});
      });

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, {
        filterableIndexPatterns: ['1'],
        doc: {
          id: undefined,
          description: undefined,
          references: [
            {
              id: '1',
              name: 'index-pattern-0',
              type: 'index-pattern',
            },
          ],
          state: {
            visualization: null, // Not yet loaded
            datasourceStates: { testDatasource: {} },
            query: { query: '', language: 'lucene' },
            filters: [],
          },
          title: '',
          type: 'lens',
          visualizationType: 'testVis',
        },
        isSaveable: false,
      });
      expect(onChange).toHaveBeenLastCalledWith({
        filterableIndexPatterns: ['1'],
        doc: {
          references: [
            {
              id: '1',
              name: 'index-pattern-0',
              type: 'index-pattern',
            },
          ],
          description: undefined,
          id: undefined,
          state: {
            visualization: { initialState: true }, // Now loaded
            datasourceStates: { testDatasource: {} },
            query: { query: '', language: 'lucene' },
            filters: [],
          },
          title: '',
          type: 'lens',
          visualizationType: 'testVis',
        },
        isSaveable: false,
      });
    });

    it('should send back a persistable document when the state changes', async () => {
      const onChange = jest.fn();

      const initialState = { datasource: '' };

      mockDatasource.initialize.mockResolvedValue(initialState);
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockVisualization.initialize.mockReturnValue({ initialState: true });

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{
              testVis: mockVisualization,
            }}
            datasourceMap={{
              testDatasource: mockDatasource,
            }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            onChange={onChange}
          />
        );
      });

      expect(onChange).toHaveBeenCalledTimes(2);

      mockDatasource.toExpression.mockReturnValue('data expression');
      mockVisualization.toExpression.mockReturnValue('vis expression');
      instance.setProps({ query: { query: 'new query', language: 'lucene' } });
      instance.update();

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(3, {
        filterableIndexPatterns: [],
        doc: {
          id: undefined,
          references: [],
          state: {
            datasourceStates: { testDatasource: { datasource: '' } },
            visualization: { initialState: true },
            query: { query: 'new query', language: 'lucene' },
            filters: [],
          },
          title: '',
          type: 'lens',
          visualizationType: 'testVis',
        },
        isSaveable: true,
      });
    });

    it('should call onChange when the datasource makes an internal state change', async () => {
      const onChange = jest.fn();

      mockDatasource.initialize.mockResolvedValue({});
      mockDatasource.getLayers.mockReturnValue(['first']);
      mockDatasource.getPersistableState = jest.fn((x) => ({
        state: x,
        savedObjectReferences: [{ type: 'index-pattern', id: '1', name: '' }],
      }));
      mockVisualization.initialize.mockReturnValue({ initialState: true });

      await act(async () => {
        instance = mount(
          <EditorFrame
            {...getDefaultProps()}
            visualizationMap={{ testVis: mockVisualization }}
            datasourceMap={{ testDatasource: mockDatasource }}
            initialDatasourceId="testDatasource"
            initialVisualizationId="testVis"
            ExpressionRenderer={expressionRendererMock}
            onChange={onChange}
          />
        );
      });

      expect(onChange).toHaveBeenCalledTimes(2);

      await act(async () => {
        (instance.find(FrameLayout).prop('dataPanel') as ReactElement)!.props.dispatch({
          type: 'UPDATE_DATASOURCE_STATE',
          updater: () => ({
            newState: true,
          }),
          datasourceId: 'testDatasource',
        });
      });

      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });
});
