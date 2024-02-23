/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMockVisualization,
  mockStoreDeps,
  createMockFramePublicAPI,
  mockDatasourceMap,
  mockDatasourceStates,
  renderWithReduxStore,
} from '../../../mocks';

import {
  Visualization,
  FramePublicAPI,
  DatasourcePublicAPI,
  SuggestionRequest,
} from '../../../types';
import { ChartSwitch, ChartSwitchProps } from './chart_switch';
import { LensAppState, applyChanges } from '../../../state_management';

describe('chart_switch', () => {
  function generateVisualization(id: string): jest.Mocked<Visualization> {
    return {
      ...createMockVisualization(id),
      getSuggestions: jest.fn((options) => [
        {
          score: 1,
          title: '',
          state: `suggestion ${id}`,
          previewIcon: 'empty',
        },
      ]),
    };
  }
  let visualizationMap = mockVisualizationMap();
  let datasourceMap = mockDatasourceMap();
  let datasourceStates = mockDatasourceStates();
  let frame = mockFrame(['a']);

  beforeEach(() => {
    visualizationMap = mockVisualizationMap();
    datasourceMap = mockDatasourceMap();
    datasourceStates = mockDatasourceStates();
    frame = mockFrame(['a']);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * There are three visualizations. Each one has the same suggestion behavior:
   *
   * visA: suggests an empty state
   * visB: suggests an empty state
   * visC:
   *  - Never switches to subvisC2
   *  - Allows a switch to subvisC3
   *  - Allows a switch to subvisC1
   */
  function mockVisualizationMap() {
    return {
      visA: generateVisualization('visA'),
      visB: generateVisualization('visB'),
      visC: {
        ...generateVisualization('visC'),
        initialize: jest.fn((_frame, state) => state ?? { type: 'subvisC1' }),
        visualizationTypes: [
          {
            icon: 'empty',
            id: 'subvisC1',
            label: 'C1',
            groupLabel: 'visCGroup',
          },
          {
            icon: 'empty',
            id: 'subvisC2',
            label: 'C2',
            groupLabel: 'visCGroup',
          },
          {
            icon: 'empty',
            id: 'subvisC3',
            label: 'C3',
            groupLabel: 'visCGroup',
          },
        ],
        getVisualizationTypeId: jest.fn((state) => state.type),
        getSuggestions: jest.fn((options) => {
          if (options.subVisualizationId === 'subvisC2') {
            return [];
          }
          // Multiple suggestions need to be filtered
          return [
            {
              score: 1,
              title: 'Primary suggestion',
              state: { type: 'subvisC3' },
              previewIcon: 'empty',
            },
            {
              score: 1,
              title: '',
              state: { type: 'subvisC1', notPrimary: true },
              previewIcon: 'empty',
            },
          ];
        }),
      },
    };
  }

  function mockFrame(layers: string[]) {
    return {
      ...createMockFramePublicAPI(),
      datasourceLayers: layers.reduce(
        (acc, layerId) => ({
          ...acc,
          [layerId]: {
            getTableSpec: jest.fn(() => {
              return [{ columnId: 2 }];
            }),
            getOperationForColumnId() {
              return {};
            },
          } as unknown as DatasourcePublicAPI,
        }),
        {} as Record<string, unknown>
      ),
    } as FramePublicAPI;
  }

  const renderChartSwitch = (
    propsOverrides: Partial<ChartSwitchProps> = {},
    { preloadedStateOverrides }: { preloadedStateOverrides: Partial<LensAppState> } = {
      preloadedStateOverrides: {},
    }
  ) => {
    const { store, ...rtlRender } = renderWithReduxStore(
      <ChartSwitch
        framePublicAPI={frame}
        visualizationMap={visualizationMap}
        datasourceMap={datasourceMap}
        {...propsOverrides}
      />,
      {},
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: 'state from a',
          },
          datasourceStates,
          activeDatasourceId: 'testDatasource',
          ...preloadedStateOverrides,
        },
      }
    );

    const openChartSwitch = () => {
      userEvent.click(screen.getByTestId('lnsChartSwitchPopover'));
    };

    const getMenuItem = (subType: string) => {
      const list = screen.getByTestId('lnsChartSwitchList');
      return within(list).getByTestId(`lnsChartSwitchPopover_${subType}`);
    };

    const switchToVis = (subType: string) => {
      fireEvent.click(getMenuItem(subType));
    };

    return {
      ...rtlRender,
      store,
      switchToVis,
      getMenuItem,
      openChartSwitch,
    };
  };

  it('should use suggested state if there is a suggestion from the target visualization', async () => {
    const { store, openChartSwitch, switchToVis } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'visB initial state',
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: {},
        },
        clearStagedPreview: true,
      },
    });
    expect(store.dispatch).not.toHaveBeenCalledWith({ type: applyChanges.type }); // should not apply changes automatically
  });

  it('should use initial state if there is no suggestion from the target visualization', async () => {
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([]);
    const { store, switchToVis, openChartSwitch } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a'); // from preloaded state
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'visB initial state',
          newVisualizationId: 'visB',
        },
        clearStagedPreview: true,
      },
    });
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/removeLayers',
      payload: { layerIds: ['a'], visualizationId: 'visA' },
    });
  });

  it('should indicate data loss if not all columns will be used', async () => {
    datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: {},
        table: {
          columns: [
            {
              columnId: 'col1',
              operation: {
                label: '',
                dataType: 'string',
                isBucketed: true,
              },
            },
            {
              columnId: 'col2',
              operation: {
                label: '',
                dataType: 'number',
                isBucketed: false,
              },
            },
          ],
          layerId: 'first',
          isMultiRow: true,
          changeType: 'unchanged',
        },
        keptLayerIds: [],
      },
    ]);
    datasourceMap.testDatasource.publicAPIMock.getTableSpec.mockReturnValue([
      { columnId: 'col1', fields: [] },
      { columnId: 'col2', fields: [] },
      { columnId: 'col3', fields: [] },
    ]);

    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();

    expect(within(getMenuItem('visB')).getByText(/warning/i)).toBeInTheDocument();
  });

  it('should indicate data loss if not all layers will be used', async () => {
    frame = mockFrame(['a', 'b']);
    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();
    expect(within(getMenuItem('visB')).getByText(/warning/i)).toBeInTheDocument();
  });

  it('should support multi-layer suggestions without data loss', async () => {
    frame = mockFrame(['a', 'b']);
    datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: {},
        table: {
          columns: [
            {
              columnId: 'a',
              operation: {
                label: '',
                dataType: 'string',
                isBucketed: true,
              },
            },
          ],
          isMultiRow: true,
          layerId: 'a',
          changeType: 'unchanged',
        },
        keptLayerIds: ['a', 'b'],
      },
    ]);
    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();
    expect(within(getMenuItem('visB')).queryByText(/warning/i)).not.toBeInTheDocument();
  });

  it('should indicate data loss if no data will be used', async () => {
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();
    expect(within(getMenuItem('visB')).queryByText(/warning/i)).toBeInTheDocument();
  });

  it('should not indicate data loss if there is no data', async () => {
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    frame = mockFrame(['a']);
    (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([]);
    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();
    expect(within(getMenuItem('visB')).queryByText(/warning/i)).not.toBeInTheDocument();
  });

  it('should not show a warning when the subvisualization is the same', async () => {
    frame = mockFrame(['a', 'b', 'c']);

    visualizationMap.visC.getVisualizationTypeId.mockReturnValue('subvisC2');
    visualizationMap.visC.switchVisualizationType = jest.fn(() => ({ type: 'subvisC1' }));
    const { openChartSwitch, getMenuItem } = renderChartSwitch(undefined, {
      preloadedStateOverrides: {
        visualization: {
          activeId: 'visC',
          state: { type: 'subvisC2' },
        },
      },
    });
    openChartSwitch();
    expect(within(getMenuItem('subvisC2')).queryByText(/warning/i)).not.toBeInTheDocument();
  });

  it('should get suggestions when switching subvisualization', async () => {
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    frame = mockFrame(['a', 'b', 'c']);
    datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

    const { openChartSwitch, switchToVis, store } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a');
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'b');
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'c');
    expect(visualizationMap.visB.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
      })
    );

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          datasourceId: undefined,
          datasourceState: undefined,
          visualizationState: 'visB initial state',
          newVisualizationId: 'visB',
        },
        clearStagedPreview: true,
      },
    });
  });

  it('should query main palette from active chart and pass into suggestions', async () => {
    const legacyPalette: SuggestionRequest['mainPalette'] = {
      type: 'legacyPalette',
      value: { type: 'palette', name: 'mock' },
    };
    visualizationMap.visA.getMainPalette = jest.fn(() => legacyPalette);
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    frame = mockFrame(['a', 'b', 'c']);
    datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

    const { openChartSwitch, switchToVis } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(visualizationMap.visA.getMainPalette).toHaveBeenCalledWith('state from a');

    expect(visualizationMap.visB.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
        mainPalette: legacyPalette,
      })
    );
  });

  it('should not remove layers when switching between subtypes', async () => {
    frame = mockFrame(['a', 'b', 'c']);
    visualizationMap.visC.switchVisualizationType = jest.fn(() => 'switched');

    const { openChartSwitch, switchToVis, store } = renderChartSwitch(undefined, {
      preloadedStateOverrides: {
        visualization: {
          activeId: 'visC',
          state: { type: 'subvisC1' },
        },
      },
    });

    openChartSwitch();
    switchToVis('subvisC3');
    expect(visualizationMap.visC.switchVisualizationType).toHaveBeenCalledWith('subvisC3', {
      type: 'subvisC3',
    });

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          datasourceId: 'testDatasource',
          datasourceState: {},
          visualizationState: 'switched',
          newVisualizationId: 'visC',
        },
        clearStagedPreview: true,
      },
    });
    expect(datasourceMap.testDatasource.removeLayer).not.toHaveBeenCalled();
  });

  it('should not remove layers and initialize with existing state when switching between subtypes without data', async () => {
    const datasourceLayers = frame.datasourceLayers as Record<string, DatasourcePublicAPI>;
    datasourceLayers.a.getTableSpec = jest.fn().mockReturnValue([]);

    visualizationMap.visC.getSuggestions = jest.fn().mockReturnValue([]);
    visualizationMap.visC.switchVisualizationType = jest.fn(() => 'switched');

    const { openChartSwitch, switchToVis } = renderChartSwitch(undefined, {
      preloadedStateOverrides: {
        visualization: {
          activeId: 'visC',
          state: { type: 'subvisC1' },
        },
      },
    });
    openChartSwitch();
    switchToVis('subvisC3');

    expect(visualizationMap.visC.switchVisualizationType).toHaveBeenCalledWith('subvisC3', {
      type: 'subvisC1',
    });
    expect(datasourceMap.testDatasource.removeLayer).not.toHaveBeenCalled();
  });

  it('should switch to the updated datasource state', async () => {
    frame = mockFrame(['a', 'b']);

    datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: 'testDatasource suggestion',
        table: {
          columns: [
            {
              columnId: 'col1',
              operation: {
                label: '',
                dataType: 'string',
                isBucketed: true,
              },
            },
            {
              columnId: 'col2',
              operation: {
                label: '',
                dataType: 'number',
                isBucketed: false,
              },
            },
          ],
          layerId: 'a',
          isMultiRow: true,
          changeType: 'unchanged',
        },
        keptLayerIds: [],
      },
    ]);

    const { openChartSwitch, switchToVis, store } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: 'testDatasource suggestion',
          visualizationState: 'visB initial state',
        },
        clearStagedPreview: true,
      },
    });
  });

  it('should ensure the new visualization has the proper subtype', async () => {
    visualizationMap.visB.switchVisualizationType = jest.fn(
      (visualizationType, state) => `${state} ${visualizationType}`
    );
    const { openChartSwitch, switchToVis, store } = renderChartSwitch();
    openChartSwitch();
    switchToVis('visB');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'visB initial state visB',
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: {},
        },
        clearStagedPreview: true,
      },
    });
  });

  it('should use the suggestion that matches the subtype', async () => {
    const { openChartSwitch, switchToVis } = renderChartSwitch(undefined, {
      preloadedStateOverrides: {
        visualization: {
          activeId: 'visC',
          state: { type: 'subvisC3' },
        },
      },
    });
    openChartSwitch();
    switchToVis('subvisC1');
    expect(visualizationMap.visC.switchVisualizationType).toHaveBeenCalledWith('subvisC1', {
      type: 'subvisC1',
      notPrimary: true,
    });
  });

  it('should show all visualization types', async () => {
    const { openChartSwitch, getMenuItem } = renderChartSwitch();
    openChartSwitch();
    const allDisplayed = ['visA', 'visB', 'subvisC1', 'subvisC2', 'subvisC3'].every((subType) =>
      getMenuItem(subType)
    );

    expect(allDisplayed).toBeTruthy();
  });
});
