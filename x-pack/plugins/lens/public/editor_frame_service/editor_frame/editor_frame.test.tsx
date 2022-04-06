/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';

// Tests are executed in a jsdom environment who does not have sizing methods,
// thus the AutoSizer will always compute a 0x0 size space
// Mock the AutoSizer inside EuiSelectable (Chart Switch) and return some dimensions > 0
jest.mock('react-virtualized-auto-sizer', () => {
  return function (props: {
    children: (dimensions: { width: number; height: number }) => React.ReactNode;
    disableHeight?: boolean;
  }) {
    const { children, disableHeight, ...otherProps } = props;
    return (
      // js-dom may complain that a non-DOM attributes are used when appending props
      // Handle the disableHeight case using native DOM styling
      <div {...otherProps} style={disableHeight ? { height: 0 } : {}}>
        {children({ width: 100, height: 100 })}
      </div>
    );
  };
});

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import { EditorFrame, EditorFrameProps } from './editor_frame';
import { DatasourcePublicAPI, DatasourceSuggestion, Visualization } from '../../types';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { fromExpression } from '@kbn/interpreter';
import {
  createMockVisualization,
  createMockDatasource,
  DatasourceMock,
  createExpressionRendererMock,
  mockStoreDeps,
} from '../../mocks';
import { inspectorPluginMock } from 'src/plugins/inspector/public/mocks';
import { ReactExpressionRendererType } from 'src/plugins/expressions/public';
import { DragDrop } from '../../drag_drop';
import { uiActionsPluginMock } from '../../../../../../src/plugins/ui_actions/public/mocks';
import { chartPluginMock } from '../../../../../../src/plugins/charts/public/mocks';
import { expressionsPluginMock } from '../../../../../../src/plugins/expressions/public/mocks';
import { mockDataPlugin, mountWithProvider } from '../../mocks';
import { setState } from '../../state_management';
import { getLensInspectorService } from '../../lens_inspector_service';

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
  const defaultProps = {
    store: {
      save: jest.fn(),
      load: jest.fn(),
    },
    redirectTo: jest.fn(),
    onError: jest.fn(),
    onChange: jest.fn(),
    dateRange: { fromDate: '', toDate: '' },
    query: { query: '', language: 'lucene' },
    core: coreMock.createStart(),
    plugins: {
      uiActions: uiActionsPluginMock.createStartContract(),
      data: mockDataPlugin(),
      expressions: expressionsPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
    },
    palettes: chartPluginMock.createPaletteRegistry(),
    lensInspector: getLensInspectorService(inspectorPluginMock.createStartContract()),
    showNoDataPopover: jest.fn(),
  };
  return defaultProps;
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
          groupLabel: 'testVisGroup',
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
          groupLabel: 'testVis2Group',
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
    it('should not render something before all datasources are initialized', async () => {
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      const { lensStore } = await mountWithProvider(<EditorFrame {...props} />, {
        preloadedState: {
          activeDatasourceId: 'testDatasource',
          datasourceStates: {
            testDatasource: {
              isLoading: true,
              state: {
                internalState1: '',
              },
            },
          },
        },
      });
      expect(mockDatasource.renderDataPanel).not.toHaveBeenCalled();
      lensStore.dispatch(
        setState({
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: {
                internalState1: '',
              },
            },
          },
        })
      );
      expect(mockDatasource.renderDataPanel).toHaveBeenCalled();
    });

    it('should initialize visualization state and render config panel', async () => {
      const initialState = {};
      mockDatasource.getLayers.mockReturnValue(['first']);

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: { ...mockVisualization, initialize: () => initialState },
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            initialize: () => Promise.resolve(),
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };

      await mountWithProvider(<EditorFrame {...props} />, {
        preloadedState: {
          visualization: { activeId: 'testVis', state: initialState },
        },
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: initialState })
      );
    });

    let instance: ReactWrapper;

    it('should render the resulting expression using the expression renderer', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            toExpression: () => 'datasource',
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };
      instance = (
        await mountWithProvider(<EditorFrame {...props} />, {
          preloadedState: {
            visualization: { activeId: 'testVis', state: {} },
            datasourceStates: {
              testDatasource: {
                isLoading: false,
                state: {
                  internalState1: '',
                },
              },
            },
          },
        })
      ).instance;

      instance.update();

      expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
        "kibana
        | lens_merge_tables layerIds=\\"first\\" tables={datasource}
        | testVis"
      `);
    });

    it('should render individual expression for each given layer', async () => {
      mockDatasource.toExpression.mockReturnValue('datasource');
      mockDatasource2.toExpression.mockImplementation((_state, layerId) => `datasource_${layerId}`);
      mockDatasource.initialize.mockImplementation((initialState) => Promise.resolve(initialState));
      mockDatasource.getLayers.mockReturnValue(['first', 'second']);
      mockDatasource2.initialize.mockImplementation((initialState) =>
        Promise.resolve(initialState)
      );
      mockDatasource2.getLayers.mockReturnValue(['third']);

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: { ...mockVisualization, toExpression: () => 'testVis' },
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            toExpression: () => 'datasource',
          },
          testDatasource2: {
            ...mockDatasource2,
            toExpression: () => 'datasource_second',
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };

      instance = (
        await mountWithProvider(<EditorFrame {...props} />, {
          preloadedState: {
            visualization: { activeId: 'testVis', state: {} },
            datasourceStates: {
              testDatasource: {
                isLoading: false,
                state: {
                  internalState1: '',
                },
              },
              testDatasource2: {
                isLoading: false,
                state: {
                  internalState1: '',
                },
              },
            },
          },
        })
      ).instance;

      instance.update();

      expect(
        fromExpression(instance.find(expressionRendererMock).prop('expression') as string)
      ).toEqual({
        type: 'expression',
        chain: expect.arrayContaining([
          expect.objectContaining({
            arguments: expect.objectContaining({ layerIds: ['first', 'second', 'third'] }),
          }),
        ]),
      });
      expect(fromExpression(instance.find(expressionRendererMock).prop('expression') as string))
        .toMatchInlineSnapshot(`
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
                ],
              },
              "function": "lens_merge_tables",
              "type": "function",
            },
            Object {
              "arguments": Object {},
              "function": "testVis",
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
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />, {
        preloadedState: {
          activeDatasourceId: 'testDatasource',
          visualization: { activeId: mockVisualization.id, state: {} },
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: '',
            },
          },
        },
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

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />);

      const setDatasourceState = (mockDatasource.renderDataPanel as jest.Mock).mock.calls[0][1]
        .setState;

      mockDatasource.renderDataPanel.mockClear();

      const updatedState = {
        title: 'shazm',
      };
      act(() => {
        setDatasourceState(updatedState);
      });

      expect(mockDatasource.renderDataPanel).toHaveBeenCalledTimes(1);
      expect(mockDatasource.renderDataPanel).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render config panel with updated datasource api after datasource state update', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />, {
        preloadedState: { visualization: { activeId: mockVisualization.id, state: {} } },
      });

      const updatedPublicAPI: DatasourcePublicAPI = {
        datasourceId: 'testDatasource',
        getOperationForColumnId: jest.fn(),
        getTableSpec: jest.fn(),
        getVisualDefaults: jest.fn(),
        getSourceId: jest.fn(),
        getFilters: jest.fn(),
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
    it('should give access to the datasource state in the datasource factory function', async () => {
      const datasourceState = {};
      mockDatasource.initialize.mockResolvedValue(datasourceState);
      mockDatasource.getLayers.mockReturnValue(['first']);

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />, {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: {},
            },
          },
        },
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
      mockVisualization2.initialize.mockReturnValue({ initial: true });
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

      const visualizationMap = {
        testVis: mockVisualization,
        testVis2: mockVisualization2,
      };

      const datasourceMap = {
        testDatasource: mockDatasource,
        testDatasource2: mockDatasource2,
      };

      const props = {
        ...getDefaultProps(),
        visualizationMap,
        datasourceMap,
        ExpressionRenderer: expressionRendererMock,
      };
      instance = (
        await mountWithProvider(<EditorFrame {...props} />, {
          storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        })
      ).instance;

      // necessary to flush elements to dom synchronously
      instance.update();
    });

    afterEach(() => {
      instance.unmount();
    });

    it('should initialize other datasource on switch', async () => {
      await act(async () => {
        instance.find('button[data-test-subj="datasource-switch"]').simulate('click');
      });
      await act(async () => {
        (
          document.querySelector(
            '[data-test-subj="datasource-switch-testDatasource2"]'
          ) as HTMLButtonElement
        ).click();
      });
      instance.update();
      expect(mockDatasource2.initialize).toHaveBeenCalled();
    });

    it('should call datasource render with new state on switch', async () => {
      const initialState = {};
      mockDatasource2.initialize.mockResolvedValue(initialState);

      instance.find('button[data-test-subj="datasource-switch"]').simulate('click');

      await act(async () => {
        (
          document.querySelector(
            '[data-test-subj="datasource-switch-testDatasource2"]'
          ) as HTMLButtonElement
        ).click();
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
        expect.any(Function), // generated layerId
        undefined,
        undefined
      );
      expect(mockVisualization2.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: { initial: true } })
      );
    });
  });

  describe('suggestions', () => {
    it('should fetch suggestions of currently active datasource', async () => {
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
          testDatasource2: mockDatasource2,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />);

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

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: mockVisualization,
          testVis2: mockVisualization2,
        },
        datasourceMap: {
          testDatasource: mockDatasource,
          testDatasource2: mockDatasource2,
        },

        ExpressionRenderer: expressionRendererMock,
      };
      await mountWithProvider(<EditorFrame {...props} />);

      expect(mockVisualization.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
    });

    let instance: ReactWrapper;
    it('should display top 5 suggestions in descending order', async () => {
      mockDatasource.getLayers.mockReturnValue(['first']);
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
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
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };
      instance = (await mountWithProvider(<EditorFrame {...props} />)).instance;

      expect(
        instance
          .find('[data-test-subj="lnsSuggestion"]')
          .find(EuiPanel)
          .map((el) => el.parents(EuiToolTip).prop('content'))
      ).toEqual([
        'Current visualization',
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
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
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
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };
      instance = (await mountWithProvider(<EditorFrame {...props} />)).instance;

      act(() => {
        instance.find('[data-test-subj="lnsSuggestion"]').at(2).simulate('click');
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(2);
      expect(mockVisualization.getConfiguration).toHaveBeenLastCalledWith(
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
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
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
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            getDatasourceSuggestionsForField: () => [generateSuggestion()],
            getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            getDatasourceSuggestionsForVisualizeField: () => [generateSuggestion()],
          },
        },

        ExpressionRenderer: expressionRendererMock,
      };
      instance = (await mountWithProvider(<EditorFrame {...props} />)).instance;

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
      const props = {
        ...getDefaultProps(),
        visualizationMap: {
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
                state: suggestionVisState,
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
                state: {},
                title: 'Suggestion3',
                previewIcon: 'empty',
              },
            ],
          },
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            getDatasourceSuggestionsForField: () => [generateSuggestion()],
            getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            getDatasourceSuggestionsForVisualizeField: () => [generateSuggestion()],
            renderDataPanel: (_element, { dragDropContext: { setDragging, dragging } }) => {
              if (!dragging || dragging.id !== 'draggedField') {
                setDragging({
                  id: 'draggedField',
                  humanData: { label: 'draggedField' },
                });
              }
            },
          },
        },

        ExpressionRenderer: expressionRendererMock,
      } as EditorFrameProps;
      instance = (
        await mountWithProvider(<EditorFrame {...props} />, {
          preloadedState: {
            datasourceStates: {
              testDatasource: {
                isLoading: false,
                state: {
                  internalState1: '',
                },
              },
            },
          },
        })
      ).instance;

      instance.update();

      act(() => {
        instance.find('[data-test-subj="mockVisA"]').find(DragDrop).prop('onDrop')!(
          {
            indexPatternId: '1',
            field: {},
            id: '1',
            humanData: { label: 'draggedField' },
          },
          'field_replace'
        );
      });

      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
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
            groupLabel: 'testVis3Group',
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

      const props = {
        ...getDefaultProps(),
        visualizationMap: {
          testVis: {
            ...mockVisualization,
            // do not return suggestions for the currently active vis, otherwise it will be chosen
            getSuggestions: () => [],
          },
          testVis2: {
            ...mockVisualization2,
            getSuggestions: () => [],
          },
          testVis3: {
            ...mockVisualization3,
          },
        },
        datasourceMap: {
          testDatasource: {
            ...mockDatasource,
            getDatasourceSuggestionsForField: () => [generateSuggestion()],
            getDatasourceSuggestionsFromCurrentState: () => [generateSuggestion()],
            getDatasourceSuggestionsForVisualizeField: () => [generateSuggestion()],
            renderDataPanel: (_element, { dragDropContext: { setDragging, dragging } }) => {
              if (!dragging || dragging.id !== 'draggedField') {
                setDragging({
                  id: 'draggedField',
                  humanData: { label: '1' },
                });
              }
            },
          },
        },

        ExpressionRenderer: expressionRendererMock,
      } as EditorFrameProps;

      instance = (await mountWithProvider(<EditorFrame {...props} />)).instance;
      instance.update();

      act(() => {
        instance.find(DragDrop).filter('[dataTestSubj="lnsWorkspace"]').prop('onDrop')!(
          {
            indexPatternId: '1',
            field: {},
            id: '1',
            humanData: {
              label: 'label',
            },
          },
          'field_replace'
        );
      });

      expect(mockVisualization3.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
    });
  });
});
