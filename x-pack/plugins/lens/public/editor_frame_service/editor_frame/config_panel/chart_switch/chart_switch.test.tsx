/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMockVisualization,
  mockStoreDeps,
  createMockFramePublicAPI,
  mockDatasourceMap,
  mockDatasourceStates,
  renderWithReduxStore,
} from '../../../../mocks';

import { DatasourcePublicAPI, SuggestionRequest, DatasourceSuggestion } from '../../../../types';
import { ChartSwitch, ChartSwitchProps } from './chart_switch';
import { LensAppState, applyChanges } from '../../../../state_management';

const mockFrame = (layers: string[]) => ({
  ...createMockFramePublicAPI(),
  datasourceLayers: layers.reduce(
    (acc, layerId) => ({
      ...acc,
      [layerId]: {
        getTableSpec: jest.fn(() => [{ columnId: 'col2' }]),
        getOperationForColumnId: () => {},
      } as unknown as DatasourcePublicAPI,
    }),
    {} as Record<string, DatasourcePublicAPI>
  ),
});

const datasourceSuggestions: Record<string, DatasourceSuggestion[]> = {
  unchanged: [
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
      keptLayerIds: ['a', 'b'],
    },
  ],
  layers: [
    {
      state: 'testDatasource suggestion layer a',
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
        changeType: 'layers',
      },
      keptLayerIds: ['a'],
    },
    {
      state: 'testDatasource suggestion layer b',
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
        layerId: 'b',
        isMultiRow: true,
        changeType: 'layers',
      },
      keptLayerIds: ['b'],
    },
  ],
};

describe('chart_switch', () => {
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
   * There are three visualizations. Each one has the following suggestion behavior:
   *
   * testVis: suggests an empty state
   * testVis2: suggests an empty state
   * testVis3:
   *  - Never switches to subvisC2
   *  - Allows a switch to subvisC3
   *  - Allows a switch to subvisC1
   */
  function mockVisualizationMap() {
    return {
      testVis: {
        ...createMockVisualization('testVis'),
        getSuggestions: jest.fn((options) => [
          {
            score: 1,
            title: '',
            state: `suggestion layer a`,
            previewIcon: 'empty',
            keptLayers: ['a'],
          },
          {
            score: 1,
            title: '',
            state: `suggestion layer b`,
            previewIcon: 'empty',
            keptLayers: ['b'],
          },
        ]),
      },
      testVis2: {
        ...createMockVisualization('testVis2'),
        getSuggestions: jest.fn((options) => [
          {
            score: 1,
            title: '',
            state: `suggestion testVis2`,
            previewIcon: 'empty',
            keptLayers: ['a'],
          },
        ]),
      },
      testVis3: {
        ...createMockVisualization('testVis3'),
        initialize: jest.fn((_frame, state) => state ?? { type: 'subvisC1' }),
        visualizationTypes: ['subvisC1', 'subvisC2', 'subvisC3'].map((id) => ({
          icon: 'empty',
          id,
          label: id,
          groupLabel: `${id}Group`,
        })),
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
        hiddenVis: { ...createMockVisualization('hiddenVis'), hideFromChartSwitch: () => true },
      },
    };
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
        layerId="a"
        {...propsOverrides}
      />,
      {},
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          visualization: {
            activeId: 'testVis',
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

    const queryWarningNode = (subType: string) =>
      within(getMenuItem(subType)).queryByTestId(`lnsChartSwitchPopoverAlert_${subType}`);

    const getMenuItem = (subType: string) => {
      return screen.getByTestId(`lnsChartSwitchPopover_${subType}`);
    };

    const switchToVis = (subType: string) => {
      fireEvent.click(getMenuItem(subType));
    };

    const waitForChartSwitchClosed = () => {
      waitFor(() => {
        expect(screen.queryByTestId('lnsChartSwitchList')).not.toBeInTheDocument();
      });
    };

    return {
      ...rtlRender,
      store,
      switchToVis,
      getMenuItem,
      openChartSwitch,
      waitForChartSwitchClosed,
      queryWarningNode,
    };
  };

  describe('data loss indicators', () => {
    it('should indicate data loss if not all columns will be used', async () => {
      datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue(
        datasourceSuggestions.unchanged
      );
      datasourceMap.testDatasource.publicAPIMock.getTableSpec.mockReturnValue([
        { columnId: 'col1', fields: [] },
        { columnId: 'col2', fields: [] },
        { columnId: 'col3', fields: [] },
      ]);

      const { openChartSwitch, queryWarningNode } = renderChartSwitch();
      openChartSwitch();

      expect(queryWarningNode('testVis2')).toHaveTextContent(
        /Changing to this visualization modifies the current configuration/i
      );
    });

    it('should indicate data loss if not all layers will be used', async () => {
      frame = mockFrame(['a', 'b']);
      const { openChartSwitch, queryWarningNode } = renderChartSwitch();
      openChartSwitch();

      expect(queryWarningNode('testVis2')).toHaveTextContent(
        'Changing to this visualization modifies currently selected layer`s configuration and removes all other layers.'
      );
    });

    it('should support multi-layer suggestions without data loss', async () => {
      frame = mockFrame(['a', 'b']);
      datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue(
        datasourceSuggestions.unchanged
      );
      (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([
        { columnId: 'col2' },
        { columnId: 'col1' },
      ]);
      const { openChartSwitch, queryWarningNode } = renderChartSwitch();
      openChartSwitch();
      expect(queryWarningNode('testVis2')).not.toBeInTheDocument();
    });

    it('should indicate data loss if no data will be used', async () => {
      visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
      const { openChartSwitch, queryWarningNode } = renderChartSwitch();
      openChartSwitch();

      expect(queryWarningNode('testVis2')).toHaveTextContent(
        'Changing to this visualization clears the current configuration.'
      );
    });

    it('should not indicate data loss if there is no data', async () => {
      visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
      frame = mockFrame(['a']);
      (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([]);
      const { openChartSwitch, queryWarningNode } = renderChartSwitch();
      openChartSwitch();
      expect(queryWarningNode('testVis2')).not.toBeInTheDocument();
    });

    it('should not show a warning when the subvisualization is the same', async () => {
      frame = mockFrame(['a', 'b', 'c']);

      visualizationMap.testVis3.getVisualizationTypeId.mockReturnValue('subvisC2');
      visualizationMap.testVis3.switchVisualizationType = jest.fn(() => ({ type: 'subvisC1' }));
      const { openChartSwitch, queryWarningNode } = renderChartSwitch(undefined, {
        preloadedStateOverrides: {
          visualization: {
            activeId: 'testVis3',
            state: { type: 'subvisC2' },
          },
        },
      });
      openChartSwitch();

      expect(queryWarningNode('subvisC2')).not.toBeInTheDocument();
    });

    it('should not show a warning when the subvisualization is compatible', async () => {
      frame = mockFrame(['a', 'b', 'c']);

      visualizationMap.testVis3.getVisualizationTypeId.mockReturnValue('subvisC2');
      visualizationMap.testVis3.switchVisualizationType = jest.fn(() => ({ type: 'subvisC1' }));
      // we're mocking that subvisC1 is compatible with subvisC2
      visualizationMap.testVis3.isSubtypeCompatible = jest.fn(
        (t1, t2) => t2 === 'subvisC1' && t1 === 'subvisC2'
      );
      const { openChartSwitch, queryWarningNode } = renderChartSwitch(undefined, {
        preloadedStateOverrides: {
          visualization: {
            activeId: 'testVis3',
            state: { type: 'subvisC2' },
          },
        },
      });
      openChartSwitch();

      // subvisC1 is compatible
      expect(queryWarningNode('subvisC1')).not.toBeInTheDocument();
      // subvisC2 is itself
      expect(queryWarningNode('subvisC2')).not.toBeInTheDocument();
      // subvisC3 is not compatible
      expect(queryWarningNode('subvisC3')).toHaveTextContent(
        'Changing to this visualization clears the current configuration.'
      );
    });
  });

  it('should initialize other visualization on switch', async () => {
    const { openChartSwitch, switchToVis } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');
    expect(visualizationMap.testVis2.initialize).toHaveBeenCalled();
  });

  it('should use suggested state if there is a suggestion from the target visualization', async () => {
    const { store, openChartSwitch, switchToVis } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'testVis2 initial state',
          newVisualizationId: 'testVis2',
          datasourceId: 'testDatasource',
          datasourceState: {},
        },
        clearStagedPreview: true,
      },
    });
    expect(store.dispatch).not.toHaveBeenCalledWith({ type: applyChanges.type }); // should not apply changes automatically
  });

  it('should use suggestions to switch to new visualization', async () => {
    const { openChartSwitch, switchToVis } = renderChartSwitch();
    const initialState = 'suggested State';
    visualizationMap.testVis2.initialize.mockReturnValueOnce({ initial: true });
    visualizationMap.testVis2.getVisualizationTypeId.mockReturnValueOnce('testVis2');
    visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([
      {
        title: 'Suggested vis',
        score: 1,
        state: initialState,
        previewIcon: 'empty',
        keptLayers: ['a'],
      },
    ]);
    openChartSwitch();
    switchToVis('testVis2');
    expect(visualizationMap.testVis2.getSuggestions).toHaveBeenCalled();
    expect(visualizationMap.testVis2.initialize).toHaveBeenCalledWith(
      expect.anything(),
      initialState
    );
  });

  it('should fall back when switching visualizations if the visualization has no suggested use', async () => {
    visualizationMap.testVis2.initialize.mockReturnValueOnce({ initial: true });
    visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
    const { openChartSwitch, switchToVis, waitForChartSwitchClosed } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');

    // expect(datasourceMap.testDatasource.publicAPIMock.getTableSpec).toHaveBeenCalled();
    expect(visualizationMap.testVis2.getSuggestions).toHaveBeenCalled();
    expect(visualizationMap.testVis2.initialize).toHaveBeenCalledWith(
      expect.any(Function), // generated layerId
      undefined,
      undefined
    );
    waitForChartSwitchClosed();
  });

  it('should use initial state if there is no suggestion from the target visualization', async () => {
    visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
    (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([]);
    const { store, switchToVis, openChartSwitch } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');

    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a'); // from preloaded state
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'testVis2 initial state',
          newVisualizationId: 'testVis2',
        },
        clearStagedPreview: true,
      },
    });
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/removeLayers',
      payload: { layerIds: ['a'], visualizationId: 'testVis' },
    });
  });

  it('should query main palette from active chart and pass into suggestions', async () => {
    const legacyPalette: SuggestionRequest['mainPalette'] = {
      type: 'legacyPalette',
      value: { type: 'palette', name: 'mock' },
    };
    visualizationMap.testVis.getMainPalette = jest.fn(() => legacyPalette);
    visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
    frame = mockFrame(['a', 'b', 'c']);
    datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

    const { openChartSwitch, switchToVis } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');

    expect(visualizationMap.testVis.getMainPalette).toHaveBeenCalledWith('state from a');

    expect(visualizationMap.testVis2.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
        mainPalette: legacyPalette,
      })
    );
  });

  it('should ensure the new visualization has the proper subtype', async () => {
    visualizationMap.testVis2.switchVisualizationType = jest.fn(
      (visualizationType, state) => `${state} ${visualizationType}`
    );
    const { openChartSwitch, switchToVis, store } = renderChartSwitch();
    openChartSwitch();
    switchToVis('testVis2');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'testVis2 initial state testVis2',
          newVisualizationId: 'testVis2',
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
          activeId: 'testVis3',
          state: { type: 'subvisC3' },
        },
      },
    });
    openChartSwitch();
    switchToVis('subvisC1');
    expect(visualizationMap.testVis3.switchVisualizationType).toHaveBeenCalledWith(
      'subvisC1',
      {
        type: 'subvisC1',
        notPrimary: true,
      },
      'a'
    );
  });

  describe('multi-layer suggestions', () => {
    it('should use suggestion for chart switch for selected layer', async () => {
      frame = mockFrame(['a', 'b']);
      datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b']);
      datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue(
        datasourceSuggestions.layers
      );
      (frame.datasourceLayers.a?.getTableSpec as jest.Mock).mockReturnValue([
        { columnId: 'col2' },
        { columnId: 'col1' },
      ]);
      (frame.datasourceLayers.b?.getTableSpec as jest.Mock).mockReturnValue([
        { columnId: 'col2' },
        { columnId: 'col1' },
      ]);

      const { store, openChartSwitch, switchToVis } = renderChartSwitch({ layerId: 'b' });
      openChartSwitch();
      switchToVis('testVis2');

      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            visualizationState: 'testVis2 initial state',
            newVisualizationId: 'testVis2',
            datasourceId: 'testDatasource',
            datasourceState: 'testDatasource suggestion layer b',
          },
          clearStagedPreview: true,
        },
      });
      expect(store.dispatch).not.toHaveBeenCalledWith({ type: applyChanges.type }); // should not apply changes automatically
    });

    it('should not remove layers when switching between subtypes', async () => {
      frame = mockFrame(['a', 'b', 'c']);
      visualizationMap.testVis3.switchVisualizationType = jest.fn(() => 'switched');

      const { openChartSwitch, switchToVis, store } = renderChartSwitch(undefined, {
        preloadedStateOverrides: {
          visualization: {
            activeId: 'testVis3',
            state: { type: 'subvisC1' },
          },
        },
      });

      openChartSwitch();
      switchToVis('subvisC3');
      expect(visualizationMap.testVis3.switchVisualizationType).toHaveBeenCalledWith(
        'subvisC3',
        {
          type: 'subvisC3',
        },
        'a'
      );

      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            datasourceId: 'testDatasource',
            datasourceState: {},
            visualizationState: 'switched',
            newVisualizationId: 'testVis3',
          },
          clearStagedPreview: true,
        },
      });
      expect(datasourceMap.testDatasource.removeLayer).not.toHaveBeenCalled();
    });

    it('should not remove layers and initialize with existing state when switching between subtypes without data', async () => {
      const datasourceLayers = frame.datasourceLayers as Record<string, DatasourcePublicAPI>;
      datasourceLayers.a.getTableSpec = jest.fn().mockReturnValue([]);

      visualizationMap.testVis3.getSuggestions = jest.fn().mockReturnValue([]);
      visualizationMap.testVis3.switchVisualizationType = jest.fn(() => 'switched');

      const { openChartSwitch, switchToVis } = renderChartSwitch(undefined, {
        preloadedStateOverrides: {
          visualization: {
            activeId: 'testVis3',
            state: { type: 'subvisC1' },
          },
        },
      });
      openChartSwitch();
      switchToVis('subvisC3');

      expect(visualizationMap.testVis3.switchVisualizationType).toHaveBeenCalledWith(
        'subvisC3',
        {
          type: 'subvisC1',
        },
        'a'
      );
      expect(datasourceMap.testDatasource.removeLayer).not.toHaveBeenCalled();
    });

    it('should switch to the updated datasource state', async () => {
      frame = mockFrame(['a', 'b']);

      datasourceMap.testDatasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue(
        datasourceSuggestions.unchanged
      );

      const { openChartSwitch, switchToVis, store } = renderChartSwitch();
      openChartSwitch();
      switchToVis('testVis2');

      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'lens/switchVisualization',
        payload: {
          suggestion: {
            newVisualizationId: 'testVis2',
            datasourceId: 'testDatasource',
            datasourceState: 'testDatasource suggestion',
            visualizationState: 'testVis2 initial state',
          },
          clearStagedPreview: true,
        },
      });
    });

    // it('should get suggestions when switching subvisualization based on the current layer', async () => {
    //   visualizationMap.testVis3.getSuggestions.mockReturnValueOnce([]);
    //   frame = mockFrame(['a', 'b', 'c']);
    //   datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

    //   const { openChartSwitch, switchToVis } = renderChartSwitch({ layerId: 'c' });
    //   openChartSwitch();
    //   screen.debug();
    //   switchToVis('testVis3');

    //   expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a');
    //   expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'b');
    //   expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'c');
    //   expect(visualizationMap.testVis2.getSuggestions).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       keptLayerIds: ['a'],
    //     })
    //   );

    //   // expect(store.dispatch).toHaveBeenCalledWith({
    //   //   type: 'lens/switchVisualization',
    //   //   payload: {
    //   //     suggestion: {
    //   //       datasourceId: undefined,
    //   //       datasourceState: undefined,
    //   //       visualizationState: 'testVis2 initial state',
    //   //       newVisualizationId: 'testVis2',
    //   //     },
    //   //     clearStagedPreview: true,
    //   //   },
    //   // });
    // });

    it('should get suggestions when switching subvisualization', async () => {
      visualizationMap.testVis2.getSuggestions.mockReturnValueOnce([]);
      frame = mockFrame(['a', 'b', 'c']);
      datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

      const { openChartSwitch, switchToVis, store } = renderChartSwitch();
      openChartSwitch();
      switchToVis('testVis2');

      expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a');
      expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'b');
      expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'c');
      expect(visualizationMap.testVis2.getSuggestions).toHaveBeenCalledWith(
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
            visualizationState: 'testVis2 initial state',
            newVisualizationId: 'testVis2',
          },
          clearStagedPreview: true,
        },
      });
    });
  });
});
