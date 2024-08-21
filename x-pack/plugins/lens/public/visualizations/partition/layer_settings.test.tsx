/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PieLayerState, PieVisualizationState } from '../..';
import { LayerSettings } from './layer_settings';
import { FramePublicAPI, VisualizationLayerSettingsProps } from '../../types';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    const props: VisualizationLayerSettingsProps<PieVisualizationState> & {
      section: 'data' | 'appearance';
    } = {
      setState: jest.fn(),
      layerId,
      state: getState(false),
      frame: {} as FramePublicAPI,
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      section: 'data',
    };

    const renderLayerSettings = (
      propsOverrides?: Partial<
        VisualizationLayerSettingsProps<PieVisualizationState> & {
          section: 'data' | 'appearance';
        }
      >
    ) => render(<LayerSettings {...props} {...propsOverrides} />);

    it('toggles multiple metrics', () => {
      renderLayerSettings();
      expect(props.setState).not.toHaveBeenCalled();
      const toggle = screen.getByRole('switch');
      userEvent.click(toggle);
      expect(props.setState).toHaveBeenLastCalledWith({
        ...props.state,
        layers: [
          {
            ...props.state.layers[0],
            allowMultipleMetrics: true,
          },
        ],
      });
      cleanup();

      renderLayerSettings({ state: getState(true) });
      userEvent.click(screen.getByRole('switch'));
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
      renderLayerSettings({ state: getState(false) });
      expect(screen.getByRole('switch')).not.toBeChecked();
      cleanup();
      renderLayerSettings({ state: getState(true) });
      expect(screen.getByRole('switch')).toBeChecked();
    });

    test('should not render anything for mosaic', () => {
      const { container } = renderLayerSettings({ state: { ...getState(false), shape: 'mosaic' } });
      expect(container).toBeEmptyDOMElement();
    });

    test('should not render anything for the appearance section', () => {
      const { container } = renderLayerSettings({ section: 'appearance' });
      expect(container).toBeEmptyDOMElement();
    });
  });
});
