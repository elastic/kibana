/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
} from '../../mocks';
import { EuiKeyPadMenuItem } from '@elastic/eui';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { Visualization, FramePublicAPI, DatasourcePublicAPI } from '../../../types';
import { Action } from '../state_management';
import { ChartSwitch } from './chart_switch';

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

  function mockVisualizations() {
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
          },
          {
            icon: 'empty',
            id: 'subvisC2',
            label: 'C2',
          },
          {
            icon: 'empty',
            id: 'subvisC3',
            label: 'C3',
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
          [layerId]: ({
            getTableSpec: jest.fn(() => {
              return [{ columnId: 2 }];
            }),
            getOperationForColumnId() {
              return {};
            },
          } as unknown) as DatasourcePublicAPI,
        }),
        {} as Record<string, unknown>
      ),
    } as FramePublicAPI;
  }

  function mockDatasourceMap() {
    const datasource = createMockDatasource('testDatasource');
    datasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      {
        state: {},
        table: {
          columns: [],
          isMultiRow: true,
          layerId: 'a',
          changeType: 'unchanged',
        },
        keptLayerIds: ['a'],
      },
    ]);
    return {
      testDatasource: datasource,
    };
  }

  function mockDatasourceStates() {
    return {
      testDatasource: {
        state: {},
        isLoading: false,
      },
    };
  }

  function showFlyout(component: ReactWrapper) {
    component.find('[data-test-subj="lnsChartSwitchPopover"]').first().simulate('click');
  }

  function switchTo(subType: string, component: ReactWrapper) {
    showFlyout(component);
    component.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).first().simulate('click');
  }

  function getMenuItem(subType: string, component: ReactWrapper) {
    showFlyout(component);
    return component
      .find(EuiKeyPadMenuItem)
      .find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`)
      .first();
  }

  it('should use suggested state if there is a suggestion from the target visualization', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={'state from a'}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('visB', component);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'suggestion visB',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
      datasourceId: 'testDatasource',
      datasourceState: {},
    });
  });

  it('should use initial state if there is no suggestion from the target visualization', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('visB', component);

    expect(frame.removeLayers).toHaveBeenCalledWith(['a']);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'visB initial state',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
    });
  });

  it('should indicate data loss if not all columns will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
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
      { columnId: 'col1' },
      { columnId: 'col2' },
      { columnId: 'col3' },
    ]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('visB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should indicate data loss if not all layers will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const frame = mockFrame(['a', 'b']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('visB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should indicate data loss if no data will be used', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('visB', component).prop('betaBadgeIconType')).toEqual('alert');
  });

  it('should not indicate data loss if there is no data', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a']);
    (frame.datasourceLayers.a.getTableSpec as jest.Mock).mockReturnValue([]);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('visB', component).prop('betaBadgeIconType')).toBeUndefined();
  });

  it('should not show a warning when the subvisualization is the same', () => {
    const dispatch = jest.fn();
    const frame = mockFrame(['a', 'b', 'c']);
    const visualizations = mockVisualizations();
    visualizations.visC.getVisualizationTypeId.mockReturnValue('subvisC2');
    const switchVisualizationType = jest.fn(() => ({ type: 'subvisC1' }));

    visualizations.visC.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visC"
        visualizationState={{ type: 'subvisC2' }}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    expect(getMenuItem('subvisC2', component).prop('betaBadgeIconType')).not.toBeDefined();
  });

  it('should get suggestions when switching subvisualization', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    visualizations.visB.getSuggestions.mockReturnValueOnce([]);
    const frame = mockFrame(['a', 'b', 'c']);

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('visB', component);

    expect(frame.removeLayers).toHaveBeenCalledTimes(1);
    expect(frame.removeLayers).toHaveBeenCalledWith(['a', 'b', 'c']);

    expect(visualizations.visB.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        keptLayerIds: ['a'],
      })
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SWITCH_VISUALIZATION',
        initialState: 'visB initial state',
      })
    );
  });

  it('should not remove layers when switching between subtypes', () => {
    const dispatch = jest.fn();
    const frame = mockFrame(['a', 'b', 'c']);
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn(() => 'switched');

    visualizations.visC.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visC"
        visualizationState={{ type: 'subvisC1' }}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisC3', component);
    expect(switchVisualizationType).toHaveBeenCalledWith('subvisC3', { type: 'subvisC3' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SWITCH_VISUALIZATION',
        initialState: 'switched',
      })
    );
    expect(frame.removeLayers).not.toHaveBeenCalled();
  });

  it('should switch to the updated datasource state', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
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

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={frame}
        datasourceMap={datasourceMap}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('visB', component);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SWITCH_VISUALIZATION',
      newVisualizationId: 'visB',
      datasourceId: 'testDatasource',
      datasourceState: 'testDatasource suggestion',
      initialState: 'suggestion visB',
    } as Action);
  });

  it('should ensure the new visualization has the proper subtype', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn(
      (visualizationType, state) => `${state} ${visualizationType}`
    );

    visualizations.visB.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('visB', component);

    expect(dispatch).toHaveBeenCalledWith({
      initialState: 'suggestion visB visB',
      newVisualizationId: 'visB',
      type: 'SWITCH_VISUALIZATION',
      datasourceId: 'testDatasource',
      datasourceState: {},
    });
  });

  it('should use the suggestion that matches the subtype', () => {
    const dispatch = jest.fn();
    const visualizations = mockVisualizations();
    const switchVisualizationType = jest.fn();

    visualizations.visC.switchVisualizationType = switchVisualizationType;

    const component = mount(
      <ChartSwitch
        visualizationId="visC"
        visualizationState={{ type: 'subvisC3' }}
        visualizationMap={visualizations}
        dispatch={dispatch}
        framePublicAPI={mockFrame(['a'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    switchTo('subvisC1', component);
    expect(switchVisualizationType).toHaveBeenCalledWith('subvisC1', {
      type: 'subvisC1',
      notPrimary: true,
    });
  });

  it('should show all visualization types', () => {
    const component = mount(
      <ChartSwitch
        visualizationId="visA"
        visualizationState={{}}
        visualizationMap={mockVisualizations()}
        dispatch={jest.fn()}
        framePublicAPI={mockFrame(['a', 'b'])}
        datasourceMap={mockDatasourceMap()}
        datasourceStates={mockDatasourceStates()}
      />
    );

    showFlyout(component);

    const allDisplayed = ['visA', 'visB', 'subvisC1', 'subvisC2', 'subvisC3'].every(
      (subType) => component.find(`[data-test-subj="lnsChartSwitchPopover_${subType}"]`).length > 0
    );

    expect(allDisplayed).toBeTruthy();
  });
});
