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
import { TitlesAndTextPopover } from './titles_and_text_popover';
import { EuiButtonGroupTestHarness } from '@kbn/test-eui-helpers';

describe('TitlesAndTextPopover', () => {
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
    iconAlign: 'left',
    valueFontMode: 'default',
  };

  const mockSetState = jest.fn();

  const renderToolbarOptions = (state: MetricVisualizationState) => {
    return {
      ...render(<TitlesAndTextPopover state={state} setState={mockSetState} />),
    };
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockSetState.mockClear();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should set a subtitle', async () => {
    renderToolbarOptions({
      ...fullState,
      breakdownByAccessor: undefined,
    });
    const labelOptionsButton = screen.getByTestId('lnsTitlesTextButton');
    labelOptionsButton.click();

    const newSubtitle = 'new subtitle hey';
    const subtitleField = screen.getByDisplayValue('subtitle');
    // cannot use userEvent because the element cannot be clicked on
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 1' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalled();
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 2' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalledTimes(2);
    fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 3' } });
    jest.advanceTimersByTime(256);
    expect(mockSetState).toHaveBeenCalledTimes(3);
    expect(mockSetState.mock.calls.map(([state]) => state.subtitle)).toMatchInlineSnapshot(`
      Array [
        "new subtitle hey 1",
        "new subtitle hey 2",
        "new subtitle hey 3",
      ]
    `);
  });

  it('should hide subtitle option when Metric has breakdown by', () => {
    renderToolbarOptions({
      ...fullState,
      breakdownByAccessor: 'some-accessor',
    });
    expect(screen.queryByDisplayValue('subtitle')).not.toBeInTheDocument();
  });

  it('should set titlesTextAlign', async () => {
    renderToolbarOptions({ ...fullState });
    const textOptionsButton = screen.getByTestId('lnsTitlesTextButton');
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
    const textOptionsButton = screen.getByTestId('lnsTitlesTextButton');
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

  it('should set valueFontMode', async () => {
    renderToolbarOptions({ ...fullState });
    const textOptionsButton = screen.getByTestId('lnsTitlesTextButton');
    textOptionsButton.click();

    const modeBtnGroup = new EuiButtonGroupTestHarness('lens-value-font-mode-btn');

    expect(modeBtnGroup.selected.textContent).toBe('Default');

    modeBtnGroup.select('Fit');
    modeBtnGroup.select('Default');

    expect(mockSetState.mock.calls.map(([s]) => s.valueFontMode)).toEqual(['fit', 'default']);
  });

  it('should set iconAlign', async () => {
    renderToolbarOptions({ ...fullState, icon: 'sortUp' });
    const textOptionsButton = screen.getByTestId('lnsTitlesTextButton');
    textOptionsButton.click();

    const iconAlignBtnGroup = new EuiButtonGroupTestHarness('lens-icon-alignment-btn');

    expect(iconAlignBtnGroup.selected.textContent).toBe('Left');

    iconAlignBtnGroup.select('Right');
    iconAlignBtnGroup.select('Left');

    expect(mockSetState.mock.calls.map(([s]) => s.iconAlign)).toEqual(['right', 'left']);
  });

  it.each([undefined, 'empty'])('should hide iconAlign option when icon is %j', async (icon) => {
    renderToolbarOptions({ ...fullState, icon });
    const textOptionsButton = screen.getByTestId('lnsTitlesTextButton');
    textOptionsButton.click();

    expect(screen.queryByTestId('lens-icon-alignment-btn')).not.toBeInTheDocument();
  });
});
