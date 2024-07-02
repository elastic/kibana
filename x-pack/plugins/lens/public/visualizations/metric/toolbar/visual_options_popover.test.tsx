/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { fireEvent, render, screen } from '@testing-library/react';
import { MetricVisualizationState } from '../types';
import { VisualOptionsPopover } from './visual_options_popover';
import { EuiButtonGroupTestHarness, EuiSelectTestHarness } from '@kbn/test-eui-helpers';

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: unknown) => fn,
}));

describe('VisualOptionsPopover', () => {
  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: 'subtitle',
    secondaryPrefix: 'extra-text',
    progressDirection: 'vertical',
    maxCols: 5,
    color: 'static-color',
    icon: 'compute',
    palette,
    showBar: true,
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-col-id',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
    titlesTextAlign: 'left',
    valuesTextAlign: 'right',
    valueFontMode: 'default',
    valueFontSize: 36,
  };

  const mockSetState = jest.fn();

  const renderToolbarOptions = (state: MetricVisualizationState) => {
    return {
      ...render(<VisualOptionsPopover state={state} setState={mockSetState} />),
    };
  };

  afterEach(() => mockSetState.mockClear());

  it('should set titlesTextAlign', async () => {
    renderToolbarOptions({ ...fullState });
    const textOptionsButton = screen.getByTestId('lnsVisualOptionsButton');
    textOptionsButton.click();

    const titlesAlignBtnGroup = new EuiButtonGroupTestHarness('lens-titles-alignment-btn');

    titlesAlignBtnGroup.select('Right');
    titlesAlignBtnGroup.select('Center');
    titlesAlignBtnGroup.select('Left');

    expect(mockSetState.mock.calls.map(([s]) => s.titlesTextAlign)).toEqual([
      'right',
      'center',
      'left',
    ]);
  });

  it('should set valuesTextAlign', async () => {
    renderToolbarOptions({ ...fullState });
    const textOptionsButton = screen.getByTestId('lnsVisualOptionsButton');
    textOptionsButton.click();

    const valueAlignBtnGroup = new EuiButtonGroupTestHarness('lens-values-alignment-btn');

    valueAlignBtnGroup.select('Center');
    valueAlignBtnGroup.select('Left');
    valueAlignBtnGroup.select('Right');

    expect(mockSetState.mock.calls.map(([s]) => s.valuesTextAlign)).toEqual([
      'center',
      'left',
      'right',
    ]);
  });

  describe('valueFontSize', () => {
    it('should set valueFontMode', async () => {
      renderToolbarOptions({ ...fullState });
      const textOptionsButton = screen.getByTestId('lnsVisualOptionsButton');
      textOptionsButton.click();

      const modeSelect = new EuiSelectTestHarness('lens-value-font-mode-select');

      expect(modeSelect.selected).toBe('default');

      modeSelect.select('fit');
      modeSelect.select('custom');
      modeSelect.select('default');

      expect(mockSetState.mock.calls.map(([s]) => s.valueFontMode)).toEqual([
        'fit',
        'custom',
        'default',
      ]);
    });

    it.each<MetricVisualizationState['valueFontMode']>(['default', 'fit'])(
      'should disable fontSize for %s mode',
      async (valueFontMode) => {
        renderToolbarOptions({ ...fullState, valueFontMode });
        const textOptionsButton = screen.getByTestId('lnsVisualOptionsButton');
        textOptionsButton.click();

        const fontSize = screen.getByTestId('lens-value-font-size');

        expect(fontSize).toBeDisabled();
      }
    );

    it('should set fontSize in custom mode', async () => {
      renderToolbarOptions({ ...fullState, valueFontMode: 'custom' });
      const textOptionsButton = screen.getByTestId('lnsVisualOptionsButton');
      textOptionsButton.click();

      const fontSize = screen.getByTestId('lens-value-font-size');

      expect(fontSize).toBeEnabled();
      expect(fontSize).toHaveValue(36);

      fireEvent.change(fontSize, { target: { value: 50 } });

      expect(fontSize).toHaveValue(50);
      expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ valueFontSize: 50 }));
    });
  });
});
