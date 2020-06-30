/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from 'test_utils/enzyme_helpers';
import { EuiButtonGroupProps, EuiSuperSelect } from '@elastic/eui';
import { LayerContextMenu, XyToolbar } from './xy_config_panel';
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
        .find('[data-test-subj="lnsXY_seriesType"]')
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ id }) => id)).toEqual([
        'bar',
        'bar_stacked',
        'line',
        'area',
        'area_stacked',
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
        .find('[data-test-subj="lnsXY_seriesType"]')
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ id }) => id)).toEqual(['bar_horizontal', 'bar_horizontal_stacked']);
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

    it('should disable the select if there is no unstacked area or line series', () => {
      const state = testState();

      const component = shallow(
        <XyToolbar
          frame={frame}
          setState={jest.fn()}
          state={{
            ...state,
            layers: [
              { ...state.layers[0], seriesType: 'bar' },
              { ...state.layers[0], seriesType: 'area_stacked' },
            ],
            fittingFunction: 'Carry',
          }}
        />
      );

      expect(component.find(EuiSuperSelect).prop('disabled')).toEqual(true);
    });
  });
});
