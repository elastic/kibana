/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import type { PaletteOutput } from '@kbn/coloring';
import {
  createMockVisualization,
  mockStoreDeps,
  createMockFramePublicAPI,
  mockDatasourceMap,
  mockDatasourceStates,
} from '../../../mocks';
import { mountWithProvider } from '../../../mocks';

// Tests are executed in a jsdom environment who does not have sizing methods,
// thus the AutoSizer will always compute a 0x0 size space
// Mock the AutoSizer inside EuiSelectable (Chart Switch) and return some dimensions > 0
jest.mock('react-virtualized-auto-sizer', () => {
  return function (props: {
    children: (dimensions: { width: number; height: number }) => React.ReactNode;
  }) {
    const { children } = props;
    return <div>{children({ width: 100, height: 100 })}</div>;
  };
});

import { Visualization, FramePublicAPI, DatasourcePublicAPI } from '../../../types';
import { ChartSwitch } from './chart_switch';
import { applyChanges } from '../../../state_management';

describe('chart_switch', () => {
  function generateVisualization(id: string): jest.Mocked<Visualization> {
    return {
      ...createMockVisualization(),
      id,
      getVisualizationTypeId: jest.fn((_state) => id),
      visualizationTypes: [
        {
          icon: 'empty',
          id,
          label: `Label ${id}`,
          groupLabel: `${id}Group`,
        },
      ],
      initialize: jest.fn((_frame, state?: unknown) => {
        return state || `${id} initial state`;
      }),
      getSuggestions: jest.fn((options) => {
        return [
          {
            score: 1,
            title: '',
            state: `suggestion ${id}`,
            previewIcon: 'empty',
          },
        ];
      }),
    };
  }

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

  function showFlyout(instance: ReactWrapper) {
    instance.find('[data-test-subj="lnsChartSwitchPopover"]').first().simulate('click');
  }

  function switchTo(subType: string, instance: ReactWrapper) {
    showFlyout(instance);
    instance.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).first().simulate('click');
  }

  function getMenuItem(subType: string, instance: ReactWrapper) {
    showFlyout(instance);
    return instance.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).first();
  }
  it('should use suggested state if there is a suggestion from the target visualization', async () => {
    const visualizationMap = mockVisualizationMap();
    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: 'state from a',
          },
        },
      }
    );

    switchTo('visB', instance);

    expect(lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'suggestion visB',
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: {},
        },
        clearStagedPreview: true,
      },
    });
    expect(lensStore.dispatch).not.toHaveBeenCalledWith({ type: applyChanges.type }); // should not apply changes automatically
  });

  it('should use initial state if there is no suggestion from the target visualization', async () => {
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);
    const datasourceMap = mockDatasourceMap();
    const datasourceStates = mockDatasourceStates();
    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          datasourceStates,
          activeDatasourceId: 'testDatasource',
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    switchTo('visB', instance);
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a'); // from preloaded state
    expect(lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'visB initial state',
          newVisualizationId: 'visB',
        },
        clearStagedPreview: true,
      },
    });
    expect(lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/removeLayers',
      payload: { layerIds: ['a'], visualizationId: 'visA' },
    });
  });

  it('should indicate data loss if not all columns will be used', async () => {
    const visualizationMap = mockVisualizationMap();
    const frame = mockFrame(['a']);
    const datasourceMap = mockDatasourceMap();
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

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    expect(
      getMenuItem('visB', instance)
        .find('[data-test-subj="lnsChartSwitchPopoverAlert_visB"]')
        .first()
        .props().type
    ).toEqual('alert');
  });

  it('should indicate data loss if not all layers will be used', async () => {
    const visualizationMap = mockVisualizationMap();
    const frame = mockFrame(['a', 'b']);
    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    expect(
      getMenuItem('visB', instance)
        .find('[data-test-subj="lnsChartSwitchPopoverAlert_visB"]')
        .first()
        .props().type
    ).toEqual('alert');
  });

  it('should support multi-layer suggestions without data loss', async () => {
    const visualizationMap = mockVisualizationMap();
    const frame = mockFrame(['a', 'b']);
    const datasourceMap = mockDatasourceMap();
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

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    expect(
      getMenuItem('visB', instance).find('[data-test-subj="lnsChartSwitchPopoverAlert_visB"]')
    ).toHaveLength(0);
  });

  it('should indicate data loss if no data will be used', async () => {
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    expect(
      getMenuItem('visB', instance)
        .find('[data-test-subj="lnsChartSwitchPopoverAlert_visB"]')
        .first()
        .props().type
    ).toEqual('alert');
  });

  it('should not indicate data loss if there is no data', async () => {
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
      />,

      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    expect(
      getMenuItem('visB', instance).find('[data-test-subj="lnsChartSwitchPopoverAlert_visB"]')
    ).toHaveLength(0);
  });

  it('should not show a warning when the subvisualization is the same', async () => {
    const frame = mockFrame(['a', 'b', 'c']);
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visC.getVisualizationTypeId.mockReturnValue('subvisC2');
    const switchVisualizationType = jest.fn(() => ({ type: 'subvisC1' }));

    visualizationMap.visC.switchVisualizationType = switchVisualizationType;

    const datasourceStates = mockDatasourceStates();

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
      />,
      {
        preloadedState: {
          datasourceStates,
          activeDatasourceId: 'testDatasource',
          visualization: {
            activeId: 'visC',
            state: { type: 'subvisC2' },
          },
        },
      }
    );

    expect(
      getMenuItem('subvisC2', instance).find(
        '[data-test-subj="lnsChartSwitchPopoverAlert_subvisC2"]'
      )
    ).toHaveLength(0);
  });

  it('should get suggestions when switching subvisualization', async () => {
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a', 'b', 'c']);
    const datasourceMap = mockDatasourceMap();
    datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);
    const datasourceStates = mockDatasourceStates();

    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          datasourceStates,
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    switchTo('visB', instance);
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith({}, 'a');
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith(undefined, 'b');
    expect(datasourceMap.testDatasource.removeLayer).toHaveBeenCalledWith(undefined, 'c');
    expect(visualizationMap.visB.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
      })
    );

    expect(lensStore.dispatch).toHaveBeenCalledWith({
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
    const visualizationMap = mockVisualizationMap();
    const mockPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    visualizationMap.visA.getMainPalette = jest.fn(() => mockPalette);
    visualizationMap.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a', 'b', 'c']);
    const currentVisState = {};
    const datasourceMap = mockDatasourceMap();
    datasourceMap.testDatasource.getLayers.mockReturnValue(['a', 'b', 'c']);

    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: currentVisState,
          },
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );

    switchTo('visB', instance);

    expect(visualizationMap.visA.getMainPalette).toHaveBeenCalledWith(currentVisState);

    expect(visualizationMap.visB.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
        mainPalette: mockPalette,
      })
    );
  });

  it('should not remove layers when switching between subtypes', async () => {
    const frame = mockFrame(['a', 'b', 'c']);
    const visualizationMap = mockVisualizationMap();
    const switchVisualizationType = jest.fn(() => 'switched');

    visualizationMap.visC.switchVisualizationType = switchVisualizationType;
    const datasourceMap = mockDatasourceMap();
    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visC',
            state: { type: 'subvisC1' },
          },
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );

    switchTo('subvisC3', instance);
    expect(switchVisualizationType).toHaveBeenCalledWith('subvisC3', { type: 'subvisC3' });

    expect(lensStore.dispatch).toHaveBeenCalledWith({
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
    const frame = mockFrame(['a']);
    frame.datasourceLayers.a.getTableSpec = jest.fn().mockReturnValue([]);
    const visualizationMap = mockVisualizationMap();
    visualizationMap.visC.getSuggestions = jest.fn().mockReturnValue([]);
    visualizationMap.visC.switchVisualizationType = jest.fn(() => 'switched');
    const datasourceMap = mockDatasourceMap();
    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visC',
            state: { type: 'subvisC1' },
          },
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );

    switchTo('subvisC3', instance);

    expect(visualizationMap.visC.switchVisualizationType).toHaveBeenCalledWith('subvisC3', {
      type: 'subvisC1',
    });
    expect(datasourceMap.testDatasource.removeLayer).not.toHaveBeenCalled();
  });

  it('should switch to the updated datasource state', async () => {
    const visualizationMap = mockVisualizationMap();
    const frame = mockFrame(['a', 'b']);
    const datasourceMap = mockDatasourceMap();
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
    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
      />,
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    switchTo('visB', instance);

    expect(lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: 'testDatasource suggestion',
          visualizationState: 'suggestion visB',
        },
        clearStagedPreview: true,
      },
    });
  });

  it('should ensure the new visualization has the proper subtype', async () => {
    const visualizationMap = mockVisualizationMap();
    const switchVisualizationType = jest.fn(
      (visualizationType, state) => `${state} ${visualizationType}`
    );

    visualizationMap.visB.switchVisualizationType = switchVisualizationType;
    const datasourceMap = mockDatasourceMap();
    const { instance, lensStore } = await mountWithProvider(
      <ChartSwitch
        framePublicAPI={mockFrame(['a'])}
        visualizationMap={visualizationMap}
        datasourceMap={datasourceMap}
      />,
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    switchTo('visB', instance);

    expect(lensStore.dispatch).toHaveBeenCalledWith({
      type: 'lens/switchVisualization',
      payload: {
        suggestion: {
          visualizationState: 'suggestion visB visB',
          newVisualizationId: 'visB',
          datasourceId: 'testDatasource',
          datasourceState: {},
        },
        clearStagedPreview: true,
      },
    });
  });

  it('should use the suggestion that matches the subtype', async () => {
    const visualizationMap = mockVisualizationMap();
    const switchVisualizationType = jest.fn();

    visualizationMap.visC.switchVisualizationType = switchVisualizationType;
    const datasourceMap = mockDatasourceMap();
    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={visualizationMap}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visC',
            state: { type: 'subvisC3' },
          },
        },
      }
    );

    switchTo('subvisC1', instance);
    expect(switchVisualizationType).toHaveBeenCalledWith('subvisC1', {
      type: 'subvisC1',
      notPrimary: true,
    });
  });

  it('should show all visualization types', async () => {
    const datasourceMap = mockDatasourceMap();
    const { instance } = await mountWithProvider(
      <ChartSwitch
        visualizationMap={mockVisualizationMap()}
        framePublicAPI={mockFrame(['a', 'b'])}
        datasourceMap={datasourceMap}
      />,
      {
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: {},
          },
        },
      }
    );

    showFlyout(instance);

    const allDisplayed = ['visA', 'visB', 'subvisC1', 'subvisC2', 'subvisC3'].every(
      (subType) => instance.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).length > 0
    );

    expect(allDisplayed).toBeTruthy();
  });
});
