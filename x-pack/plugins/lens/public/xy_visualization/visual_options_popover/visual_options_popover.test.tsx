/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test/jest';
import { Position } from '@elastic/charts';
import { FramePublicAPI } from '../../types';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { State } from '../types';
import { VisualOptionsPopover } from './visual_options_popover';
import { ToolbarPopover } from '../../shared_components';
import { MissingValuesOptions } from './missing_values_option';
import { FillOpacityOption } from './fill_opacity_option';

describe('Visual options popover', () => {
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
  it('should disable the visual options for stacked bar charts', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'bar_stacked' }],
        }}
      />
    );

    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
  });

  it('should disable the values and fitting for percentage area charts', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'area_percentage_stacked' }],
        }}
      />
    );

    expect(component.find(MissingValuesOptions).prop('isValueLabelsEnabled')).toEqual(false);
    expect(component.find(MissingValuesOptions).prop('isFittingEnabled')).toEqual(false);
  });

  it('should not disable the fill opacity for percentage area charts', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'area_percentage_stacked' }],
        }}
      />
    );

    expect(component.find(FillOpacityOption).prop('isFillOpacityEnabled')).toEqual(true);
  });

  it('should not disable the visual options for percentage area charts', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'area_percentage_stacked' }],
        }}
      />
    );

    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(false);
  });

  it('should disabled the popover if there is histogram series', () => {
    // make it detect an histogram series
    frame.datasourceLayers.first.getOperationForColumnId = jest.fn().mockReturnValueOnce({
      isBucketed: true,
      scale: 'interval',
    });
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0] }],
        }}
      />
    );

    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
  });

  it('should hide the fitting option for bar series', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }],
          fittingFunction: 'Carry',
        }}
      />
    );

    expect(component.find(MissingValuesOptions).prop('isFittingEnabled')).toEqual(false);
  });

  it('should hide the fill opacity option for bar series', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }],
          fittingFunction: 'Carry',
        }}
      />
    );

    expect(component.find(FillOpacityOption).prop('isFillOpacityEnabled')).toEqual(false);
  });

  it('should hide the fill opacity option for line series', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'line' }],
          fittingFunction: 'Carry',
        }}
      />
    );

    expect(component.find(FillOpacityOption).prop('isFillOpacityEnabled')).toEqual(false);
  });

  it('should show the popover and display field enabled for bar and horizontal_bar series', () => {
    const state = testState();

    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }],
          fittingFunction: 'Carry',
        }}
      />
    );

    expect(component.find(MissingValuesOptions).prop('isValueLabelsEnabled')).toEqual(true);
  });

  it('should hide in the popover the display option for area and line series', () => {
    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={{
          ...state,
          layers: [{ ...state.layers[0], seriesType: 'area' }],
          fittingFunction: 'Carry',
        }}
      />
    );

    expect(component.find(MissingValuesOptions).prop('isValueLabelsEnabled')).toEqual(false);
  });

  it('should keep the display option for bar series with multiple layers', () => {
    frame.datasourceLayers = {
      ...frame.datasourceLayers,
      second: createMockDatasource('test').publicAPIMock,
    };

    const state = testState();
    const component = shallow(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
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

    expect(component.find(MissingValuesOptions).prop('isValueLabelsEnabled')).toEqual(true);
  });
});
