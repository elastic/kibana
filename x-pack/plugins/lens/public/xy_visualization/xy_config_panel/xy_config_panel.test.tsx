/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { EuiButtonGroupProps, EuiButtonGroup } from '@elastic/eui';
import { XyToolbar } from '.';
import { DimensionEditor } from './dimension_editor';
import { AxisSettingsPopover } from './axis_settings_popover';
import { FramePublicAPI } from '../../types';
import { State, XYState } from '../types';
import { Position } from '@elastic/charts';
import { createMockFramePublicAPI, createMockDatasource } from '../../mocks';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { EuiColorPicker } from '@elastic/eui';
import { layerTypes } from '../../../common';
import { XYDataLayerConfig } from '../../../../../../src/plugins/chart_expressions/expression_xy/common';

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
          layerType: layerTypes.DATA,
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

  describe('XyToolbar', () => {
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
            layers: [
              {
                ...state.layers[0],
                yConfig: [{ axisMode: 'right', forAccessor: 'bar' }],
              } as XYDataLayerConfig,
            ],
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
            layers: [
              {
                ...state.layers[0],
                yConfig: [{ axisMode: 'right', forAccessor: 'foo' }],
              } as XYDataLayerConfig,
            ],
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).length).toEqual(3);
    });

    it('should pass in endzone visibility setter and current sate for time chart', () => {
      (frame.datasourceLayers.first.getOperationForColumnId as jest.Mock).mockReturnValue({
        dataType: 'date',
      });
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            hideEndzones: true,
            layers: [
              {
                ...state.layers[0],
                yConfig: [{ axisMode: 'right', forAccessor: 'foo' }],
              } as XYDataLayerConfig,
            ],
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).at(0).prop('setEndzoneVisibility')).toBeFalsy();
      expect(component.find(AxisSettingsPopover).at(1).prop('setEndzoneVisibility')).toBeTruthy();
      expect(component.find(AxisSettingsPopover).at(1).prop('endzonesVisible')).toBe(false);
      expect(component.find(AxisSettingsPopover).at(2).prop('setEndzoneVisibility')).toBeFalsy();
    });

    it('should pass in information about current data bounds', () => {
      const state = testState();
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [{ bar: -5 }, { bar: 50 }],
          columns: [
            {
              id: 'baz',
              meta: {
                type: 'number',
              },
              name: 'baz',
            },
            {
              id: 'foo',
              meta: {
                type: 'number',
              },
              name: 'foo',
            },
            {
              id: 'bar',
              meta: {
                type: 'number',
              },
              name: 'bar',
            },
          ],
        },
      };
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            yLeftExtent: {
              mode: 'custom',
              lowerBound: 123,
              upperBound: 456,
            },
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).at(0).prop('dataBounds')).toEqual({
        min: -5,
        max: 50,
      });
    });

    it('should pass in extent information', () => {
      const state = testState();
      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            yLeftExtent: {
              mode: 'custom',
              lowerBound: 123,
              upperBound: 456,
            },
          }}
        />
      );

      expect(component.find(AxisSettingsPopover).at(0).prop('extent')).toEqual({
        mode: 'custom',
        lowerBound: 123,
        upperBound: 456,
      });
      expect(component.find(AxisSettingsPopover).at(0).prop('setExtent')).toBeTruthy();
      expect(component.find(AxisSettingsPopover).at(1).prop('extent')).toBeFalsy();
      expect(component.find(AxisSettingsPopover).at(1).prop('setExtent')).toBeFalsy();
      // default extent
      expect(component.find(AxisSettingsPopover).at(2).prop('extent')).toEqual({
        mode: 'full',
      });
      expect(component.find(AxisSettingsPopover).at(2).prop('setExtent')).toBeTruthy();
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
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' } as XYDataLayerConfig],
          }}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Bottom', 'Auto', 'Top']);
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
          panelRef={React.createRef()}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Left', 'Auto', 'Right']);
    });

    test('sets the color of a dimension to the color from palette service if not set explicitly', () => {
      const state = {
        ...testState(),
        layers: [
          {
            seriesType: 'bar',
            layerType: layerTypes.DATA,
            layerId: 'first',
            splitAccessor: undefined,
            xAccessor: 'foo',
            accessors: ['bar'],
          },
        ],
      } as XYState;
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
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('black');
    });

    test('uses the overwrite color if set', () => {
      const state = {
        ...testState(),
        layers: [
          {
            seriesType: 'bar',
            layerType: layerTypes.DATA,
            layerId: 'first',
            splitAccessor: undefined,
            xAccessor: 'foo',
            accessors: ['bar'],
            yConfig: [{ forAccessor: 'bar', color: 'red' }],
          },
        ],
      } as XYState;

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
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('red');
    });
  });
});
