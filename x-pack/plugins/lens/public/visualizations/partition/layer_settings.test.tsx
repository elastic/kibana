/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { PieLayerState, PieVisualizationState } from '../..';
import { LayerSettings } from './layer_settings';
import { FramePublicAPI, VisualizationLayerSettingsProps } from '../../types';
import { EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

describe('layer settings', () => {
  describe('multiple metrics switch', () => {
    const getState = (allowMultipleMetrics: boolean): PieVisualizationState => ({
      shape: 'pie',
      layers: [
        {
          layerId,
          allowMultipleMetrics,
        } as PieLayerState,
      ],
    });

    const layerId = 'layer-id';
    const props: VisualizationLayerSettingsProps<PieVisualizationState> = {
      setState: jest.fn(),
      layerId,
      state: getState(false),
      frame: {} as FramePublicAPI,
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
    };

    it('toggles multiple metrics', () => {
      const toggleOn = () =>
        shallow(<LayerSettings {...props} />)
          .find(EuiSwitch)
          .props()
          .onChange({} as EuiSwitchEvent);

      const toggleOff = () =>
        shallow(<LayerSettings {...props} state={getState(true)} />)
          .find(EuiSwitch)
          .props()
          .onChange({} as EuiSwitchEvent);

      expect(props.setState).not.toHaveBeenCalled();

      toggleOn();

      expect(props.setState).toHaveBeenLastCalledWith({
        ...props.state,
        layers: [
          {
            ...props.state.layers[0],
            allowMultipleMetrics: true,
          },
        ],
      });

      toggleOff();

      expect(props.setState).toHaveBeenLastCalledWith({
        ...props.state,
        layers: [
          {
            ...props.state.layers[0],
            allowMultipleMetrics: false,
          },
        ],
      });
    });

    test('switch reflects state', () => {
      const isChecked = (state: PieVisualizationState) =>
        shallow(<LayerSettings {...props} state={state} />)
          .find(EuiSwitch)
          .props().checked;

      expect(isChecked(getState(false))).toBeFalsy();
      expect(isChecked(getState(true))).toBeTruthy();
    });

    test('hides option for mosaic', () => {
      expect(
        shallow(
          <LayerSettings {...props} state={{ ...getState(false), shape: 'mosaic' }} />
        ).isEmptyRender()
      ).toBeTruthy();
    });
  });
});
