/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from 'test_utils/enzyme_helpers';
import { EuiButtonGroupProps, EuiSuperSelect, EuiButtonGroup } from '@elastic/eui';
import { LayerContextMenu, XyToolbar, DimensionEditor } from './xy_config_panel';
import { ToolbarPopover } from '../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { FramePublicAPI } from '../types';
import { State } from './types';
import { Position } from '@elastic/charts';
import { createMockFramePublicAPI, createMockDatasource } from '../editor_frame_service/mocks';

describe('XY Config panels', () => {
  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
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

    it('should disable the popover if there is no area or line series', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar' }],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.find(ToolbarPopover).at(0).prop('isDisabled')).toEqual(true);
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
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Auto', 'Left', 'Right']);
    });
  });
});
