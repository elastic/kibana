/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { ReactWrapper } from 'enzyme';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorFrame, EditorFrameProps } from './editor_frame';
import {
  DatasourceMap,
  DatasourcePublicAPI,
  DatasourceSuggestion,
  Visualization,
  VisualizationMap,
} from '../../types';
import { act } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import {
  createMockVisualization,
  createMockDatasource,
  DatasourceMock,
  createExpressionRendererMock,
  mockStoreDeps,
  renderWithReduxStore,
} from '../../mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { Droppable, useDragDropContext } from '@kbn/dom-drag-drop';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { mockDataPlugin, mountWithProvider } from '../../mocks';
import { LensAppState, setState } from '../../state_management';
import { getLensInspectorService } from '../../lens_inspector_service';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';

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

function wrapDataViewsContract() {
  const dataViewsContract = dataViewPluginMocks.createStartContract();
  return {
    ...dataViewsContract,
    getIdsWithTitle: jest.fn(async () => [
      { id: '1', title: 'IndexPatternTitle' },
      { id: '2', title: 'OtherIndexPatternTitle' },
    ]),
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
      dataViews: wrapDataViewsContract(),
      eventAnnotationService: {} as EventAnnotationServiceType,
    },
    palettes: chartPluginMock.createPaletteRegistry(),
    lensInspector: getLensInspectorService(inspectorPluginMock.createStartContract()),
    showNoDataPopover: jest.fn(),
    indexPatternService: createIndexPatternServiceMock(),
    getUserMessages: () => [],
    addUserMessages: () => () => {},
    ExpressionRenderer: createExpressionRendererMock(),
  };
  return defaultProps;
}

describe('editor_frame', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  let mockVisualization2: jest.Mocked<Visualization>;
  let mockDatasource2: DatasourceMock;

  let visualizationMap: VisualizationMap;
  let datasourceMap: DatasourceMap;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockVisualization2 = createMockVisualization('testVis2', ['second']);

    mockDatasource = createMockDatasource();
    mockDatasource2 = createMockDatasource('testDatasource2');
    mockDatasource.getLayers.mockReturnValue(['first']);
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

    visualizationMap = {
      testVis: mockVisualization,
      testVis2: mockVisualization2,
    };

    datasourceMap = {
      testDatasource: mockDatasource,
      testDatasource2: mockDatasource2,
    };
  });

  const renderEditorFrame = (
    propsOverrides: Partial<EditorFrameProps> = {},
    { preloadedStateOverrides }: { preloadedStateOverrides: Partial<LensAppState> } = {
      preloadedStateOverrides: {},
    }
  ) => {
    const { store, ...rtlRender } = renderWithReduxStore(
      <EditorFrame
        {...getDefaultProps()}
        visualizationMap={visualizationMap}
        datasourceMap={datasourceMap}
        {...propsOverrides}
      />,
      {},
      {
        preloadedState: {
          activeDatasourceId: 'testDatasource',
          visualization: { activeId: mockVisualization.id, state: 'initialState' },
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: {
                internalState: 'datasourceState',
              },
            },
          },
          ...preloadedStateOverrides,
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );

    const queryLayerPanel = () => screen.queryByTestId('lns-layerPanel-0');
    const queryWorkspacePanel = () => screen.queryByTestId('lnsWorkspace');
    const queryDataPanel = () => screen.queryByTestId('lnsDataPanelWrapper');

    return {
      ...rtlRender,
      store,
      queryLayerPanel,
      queryWorkspacePanel,
      queryDataPanel,
      simulateLoadingDatasource: () =>
        store.dispatch(
          setState({
            datasourceStates: {
              testDatasource: {
                isLoading: false,
                state: {
                  internalState: 'datasourceState',
                },
              },
            },
          })
        ),
    };
  };

  describe('initialization', () => {
    it('should render workspace panel, data panel and layer panel when all datasources are initialized', async () => {
      const { queryWorkspacePanel, queryDataPanel, queryLayerPanel, simulateLoadingDatasource } =
        renderEditorFrame(undefined, {
          preloadedStateOverrides: {
            datasourceStates: {
              testDatasource: {
                isLoading: true,
                state: {
                  internalState: 'datasourceState',
                },
              },
            },
          },
        });

      expect(mockVisualization.getConfiguration).not.toHaveBeenCalled();
      expect(queryWorkspacePanel()).not.toBeInTheDocument();
      expect(queryDataPanel()).not.toBeInTheDocument();
      expect(queryLayerPanel()).not.toBeInTheDocument();

      simulateLoadingDatasource();
      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'initialState' })
      );

      expect(queryWorkspacePanel()).toBeInTheDocument();
      expect(queryDataPanel()).toBeInTheDocument();
      expect(queryLayerPanel()).toBeInTheDocument();
    });
    it('should render the resulting expression using the expression renderer', async () => {
      renderEditorFrame();
      expect(screen.getByTestId('lnsExpressionRenderer')).toHaveTextContent(
        'datasource_expression | testVis'
      );
    });
  });

  describe('state update', () => {
    it('should re-render config panel after state update', async () => {
      const { store } = renderEditorFrame();
      const updatedState = 'updatedVisState';

      store.dispatch(
        setState({
          visualization: {
            activeId: mockVisualization.id,
            state: updatedState,
          },
        })
      );

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(3);
      expect(mockVisualization.getConfiguration).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render data panel after state update', async () => {
      renderEditorFrame();

      const setDatasourceState = (mockDatasource.DataPanelComponent as jest.Mock).mock.calls[0][0]
        .setState;

      mockDatasource.DataPanelComponent.mockClear();

      const updatedState = {
        title: 'shazm',
      };

      setDatasourceState(updatedState);

      expect(mockDatasource.DataPanelComponent).toHaveBeenCalledTimes(1);
      expect(mockDatasource.DataPanelComponent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: updatedState,
        })
      );
    });

    it('should re-render config panel with updated datasource api after datasource state update', async () => {
      renderEditorFrame();

      const updatedPublicAPI: DatasourcePublicAPI = {
        datasourceId: 'testDatasource',
        getOperationForColumnId: jest.fn(),
        getTableSpec: jest.fn(),
        getVisualDefaults: jest.fn(),
        getSourceId: jest.fn(),
        getFilters: jest.fn(),
        getMaxPossibleNumValues: jest.fn(),
        isTextBasedLanguage: jest.fn(() => false),
        hasDefaultTimeField: jest.fn(() => true),
      };
      mockDatasource.getPublicAPI.mockReturnValue(updatedPublicAPI);
      mockVisualization.getConfiguration.mockClear();

      const setDatasourceState = (mockDatasource.DataPanelComponent as jest.Mock).mock.calls[0][0]
        .setState;

      setDatasourceState('newState');

      expect(mockVisualization.getConfiguration).toHaveBeenCalledTimes(1);
      expect(mockVisualization.getConfiguration).toHaveBeenCalledWith(
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
      renderEditorFrame();

      expect(mockDatasource.getPublicAPI).toHaveBeenCalledWith({
        state: { internalState: 'datasourceState' },
        layerId: 'first',
        indexPatterns: {},
      });
    });
  });

  describe('suggestions', () => {
    it('should fetch suggestions of currently active datasource', async () => {
      renderEditorFrame();
      expect(mockDatasource.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
      expect(mockDatasource2.getDatasourceSuggestionsFromCurrentState).not.toHaveBeenCalled();
    });

    it('should fetch suggestions of all visualizations', async () => {
      renderEditorFrame();

      expect(mockVisualization.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
    });

    it('should display top 5 suggestions in descending order', async () => {
      visualizationMap = {
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
      };

      renderEditorFrame();

      expect(
        within(screen.getByTestId('lnsSuggestionsPanel'))
          .getAllByTestId('lnsSuggestion')
          .map((el) => el.textContent)
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
      const suggestionVisState = { suggested: true };

      visualizationMap = {
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
      };

      renderEditorFrame();
      await userEvent.click(screen.getByLabelText(/Suggestion1/i));

      expect(mockVisualization.getConfiguration).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: suggestionVisState,
        })
      );
      expect(mockDatasource.DataPanelComponent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: newDatasourceState,
        })
      );
    });
    describe('legacy tests', () => {
      let instance: ReactWrapper;

      afterEach(() => {
        instance.unmount();
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
              DataPanelComponent: jest.fn().mockImplementation(() => <div />),
            },
          },
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
          instance.find('[data-test-subj="mockVisA"]').find(Droppable).prop('onDrop')!(
            {
              indexPatternId: '1',
              field: {},
              id: '1',
              humanData: { label: 'draggedField' },
            },
            'field_add'
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
          ...createMockVisualization('testVis3', ['third']),
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
              DataPanelComponent: jest.fn().mockImplementation(() => {
                const [, dndDispatch] = useDragDropContext();
                useEffect(() => {
                  dndDispatch({
                    type: 'startDragging',
                    payload: {
                      dragging: {
                        id: 'draggedField',
                        humanData: { label: '1' },
                      },
                    },
                  });
                }, [dndDispatch]);
                return <div />;
              }),
            },
          },
        } as EditorFrameProps;

        instance = (await mountWithProvider(<EditorFrame {...props} />)).instance;

        instance.update();

        act(() => {
          instance.find(Droppable).filter('[dataTestSubj="lnsWorkspace"]').prop('onDrop')!(
            {
              indexPatternId: '1',
              field: {},
              id: '1',
              humanData: {
                label: 'label',
              },
            },
            'field_add'
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
});
