/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test/jest';
import { EuiButtonGroupProps, EuiSuperSelect, EuiButtonGroup } from '@elastic/eui';
import { LayerContextMenu, XyToolbar, DimensionEditor } from './xy_config_panel';
import { ToolbarPopover } from '../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { FramePublicAPI } from '../types';
import { State } from './types';
import { Position } from '@elastic/charts';
import { createMockFramePublicAPI, createMockDatasource } from '../editor_frame_service/mocks';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { EuiColorPicker } from '@elastic/eui';

describe('XY Config panels', () => {
  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
    };
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
  });

  describe('LayerContextMenu', () => {
    test('enables stacked chart types even when there is no split series', () => {
      const state = testState();
      const component = mount(
        <LayerContextMenu
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          state={{ ...state, layers: [{ ...state.layers[0], xAccessor: 'shazm' }] }}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ id }) => id)).toEqual([
        'bar',
        'bar_stacked',
        'bar_percentage_stacked',
        'area',
        'area_stacked',
        'area_percentage_stacked',
        'line',
      ]);

      expect(options!.filter(({ isDisabled }) => isDisabled).map(({ id }) => id)).toEqual([]);
    });

    test('shows only horizontal bar options when in horizontal mode', () => {
      const state = testState();
      const component = mount(
        <LayerContextMenu
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          state={{ ...state, layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }] }}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ id }) => id)).toEqual([
        'bar_horizontal',
        'bar_horizontal_stacked',
        'bar_horizontal_percentage_stacked',
      ]);
      expect(options!.filter(({ isDisabled }) => isDisabled).map(({ id }) => id)).toEqual([]);
    });
  });

  describe('XyToolbar', () => {
    it('should show currently selected fitting function', () => {
      const state = testState();

      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'line' }],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.find(EuiSuperSelect).prop('valueOfSelected')).toEqual('Carry');
    });

    it('should show currently selected value labels display setting', () => {
      const state = testState();

      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar' }],
            fittingFunction: 'Carry',
            valueLabels: 'inside',
          }}
        />
      );

      expect(component.find(EuiButtonGroup).prop('idSelected')).toEqual('value_labels_inside');
    });

    it('should disable the popover for stacked bar charts', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar_stacked' }],
          }}
        />
      );

      expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
    });

    it('should disable the popover for percentage area charts', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'area_percentage_stacked' }],
          }}
        />
      );

      expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
    });

    it('should disabled the popover if there is histogram series', () => {
      // make it detect an histogram series
      frame.datasourceLayers.first.getOperationForColumnId = jest.fn().mockReturnValueOnce({
        isBucketed: true,
        scale: 'interval',
      });
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0] }],
          }}
        />
      );

      expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
    });

    it('should show the popover and display field enabled for bar and horizontal_bar series', () => {
      const state = testState();

      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.exists('[data-test-subj="lnsValueLabelsDisplay"]')).toEqual(true);
    });

    it('should hide the fitting option for bar series', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.exists('[data-test-subj="lnsMissingValuesSelect"]')).toEqual(false);
    });

    it('should hide in the popover the display option for area and line series', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'area' }],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.exists('[data-test-subj="lnsValueLabelsDisplay"]')).toEqual(false);
    });

    it('should keep the display option for bar series with multiple layers', () => {
      frame.datasourceLayers = {
        ...frame.datasourceLayers,
        second: createMockDatasource('test').publicAPIMock,
      };

      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [
              { ...state.layers[0], seriesType: 'bar' },
              {
                seriesType: 'bar',
                layerId: 'second',
                splitAccessor: 'baz',
                xAccessor: 'foo',
                accessors: ['bar'],
              },
            ],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.exists('[data-test-subj="lnsValueLabelsDisplay"]')).toEqual(true);
    });

    it('should disable the popover if there is no right axis', () => {
      const state = testState();
      const component = shallow(<XyToolbar frame={frame} setState={jest.fn()} state={state} />);

      expect(component.find(AxisSettingsPopover).at(2).prop('isDisabled')).toEqual(true);
    });

    it('should enable the popover if there is right axis', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], yConfig: [{ axisMode: 'right', forAccessor: 'bar' }] }],
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).at(2).prop('isDisabled')).toEqual(false);
    });

    it('should render the AxisSettingsPopover 3 times', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], yConfig: [{ axisMode: 'right', forAccessor: 'foo' }] }],
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).length).toEqual(3);
    });
  });

  describe('Dimension Editor', () => {
    test('shows the correct axis side options when in horizontal mode', () => {
      const state = testState();
      const component = mount(
        <DimensionEditor
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={{ ...state, layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }] }}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Auto', 'Bottom', 'Top']);
    });

    test('shows the default axis side options when not in horizontal mode', () => {
      const state = testState();
      const component = mount(
        <DimensionEditor
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Auto', 'Left', 'Right']);
    });

    test('sets the color of a dimension to the color from palette service if not set explicitly', () => {
      const state = testState();
      const component = mount(
        <DimensionEditor
          layerId={state.layers[0].layerId}
          frame={{
            ...frame,
            activeData: {
              first: {
                type: 'datatable',
                columns: [],
                rows: [{ bar: 123 }],
              },
            },
          }}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={{
            ...state,
            layers: [
              {
                seriesType: 'bar',
                layerId: 'first',
                splitAccessor: undefined,
                xAccessor: 'foo',
                accessors: ['bar'],
              },
            ],
          }}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('black');
    });

    test('uses the overwrite color if set', () => {
      const state = testState();
      const component = mount(
        <DimensionEditor
          layerId={state.layers[0].layerId}
          frame={{
            ...frame,
            activeData: {
              first: {
                type: 'datatable',
                columns: [],
                rows: [{ bar: 123 }],
              },
            },
          }}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={{
            ...state,
            layers: [
              {
                seriesType: 'bar',
                layerId: 'first',
                splitAccessor: undefined,
                xAccessor: 'foo',
                accessors: ['bar'],
                yConfig: [{ forAccessor: 'bar', color: 'red' }],
              },
            ],
          }}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('red');
    });
  });
});
