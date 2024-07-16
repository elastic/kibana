/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegendSettingsPopover, LegendSettingsPopoverProps } from './legend_settings_popover';
import userEvent from '@testing-library/user-event';
import { RenderOptions, fireEvent, render, screen } from '@testing-library/react';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';
import { LegendValue } from '@elastic/charts';

describe('Legend Settings', () => {
  let defaultProps: LegendSettingsPopoverProps;
  beforeEach(() => {
    defaultProps = {
      legendOptions: [
        {
          id: `test_legend_auto`,
          value: 'auto',
          label: 'Auto',
        },
        {
          id: `test_legend_show`,
          value: 'show',
          label: 'Show',
        },
        {
          id: `test_legend_hide`,
          value: 'hide',
          label: 'Hide',
        },
      ],
      mode: 'auto',
      showAutoLegendSizeOption: true,
      onDisplayChange: jest.fn(),
      onPositionChange: jest.fn(),
      onLegendSizeChange: jest.fn(),
    };
  });

  const renderLegendSettingsPopover = (
    overrideProps?: Partial<LegendSettingsPopoverProps>,
    renderOptions?: RenderOptions
  ) => {
    const rtlRender = render(
      <LegendSettingsPopover {...defaultProps} {...overrideProps} />,
      renderOptions
    );
    const openLegendPopover = () => userEvent.click(screen.getByRole('button', { name: 'Legend' }));
    openLegendPopover();

    return {
      ...rtlRender,
      getSelectedDisplayOption: getSelectedButtonInGroup('lens-legend-display-btn'),
    };
  };

  it('should have selected the given mode as Display value', () => {
    const { getSelectedDisplayOption } = renderLegendSettingsPopover();
    expect(getSelectedDisplayOption()).toHaveTextContent('Auto');
  });

  it('should have called the onDisplayChange function on ButtonGroup change', () => {
    renderLegendSettingsPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(defaultProps.onDisplayChange).toHaveBeenCalled();
  });

  it('should have default line limit set to one and be enabled when it is on', () => {
    renderLegendSettingsPopover({ shouldTruncate: true });
    const lineLimit = screen.getByRole('spinbutton', { name: 'Line limit' });
    expect(lineLimit).toHaveValue(1);
    expect(lineLimit).not.toBeDisabled();
  });

  it('should have default line limit set to one and be disabled when it is off', () => {
    renderLegendSettingsPopover({ shouldTruncate: false });
    const lineLimit = screen.getByRole('spinbutton', { name: 'Line limit' });
    expect(lineLimit).toHaveValue(1);
    expect(lineLimit).toBeDisabled();
  });

  it('should have the `Label truncation` switch enabled by default', () => {
    renderLegendSettingsPopover();
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    expect(switchElement).toBeChecked();
  });

  it('should set the truncate switch state when truncate prop value is false', () => {
    renderLegendSettingsPopover({ shouldTruncate: false });
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    expect(switchElement).not.toBeChecked();
  });

  it('should have called the onTruncateLegendChange function on truncate switch change', () => {
    const onTruncateLegendChange = jest.fn();
    renderLegendSettingsPopover({ onTruncateLegendChange });
    const switchElement = screen.getByRole('switch', { name: 'Label truncation' });
    fireEvent.click(switchElement);
    expect(onTruncateLegendChange).toHaveBeenCalled();
  });

  it('should enable the Nested Legend Switch when renderNestedLegendSwitch prop is true', () => {
    renderLegendSettingsPopover({ renderNestedLegendSwitch: true });
    expect(screen.getByRole('switch', { name: 'Nested' })).toBeEnabled();
  });

  it('should set the switch state on nestedLegend prop value', () => {
    renderLegendSettingsPopover({ renderNestedLegendSwitch: true, nestedLegend: true });
    expect(screen.getByRole('switch', { name: 'Nested' })).toBeChecked();
  });

  it('should have called the onNestedLegendChange function on switch change', () => {
    const onNestedLegendChange = jest.fn();
    renderLegendSettingsPopover({ renderNestedLegendSwitch: true, onNestedLegendChange });
    const switchElement = screen.getByRole('switch', { name: 'Nested' });
    fireEvent.click(switchElement);
    expect(onNestedLegendChange).toHaveBeenCalled();
  });

  it('should hide switch group on hide mode', () => {
    renderLegendSettingsPopover({ mode: 'hide', renderNestedLegendSwitch: true });
    expect(screen.queryByRole('switch', { name: 'Nested' })).toBeNull();
  });

  it('should display allowed legend stats', () => {
    const onLegendStatsChange = jest.fn();
    renderLegendSettingsPopover({
      allowedLegendStats: [
        {
          label: 'Current and last value',
          value: LegendValue.CurrentAndLastValue,
          toolTipContent: 'Shows the current and last value',
        },
        {
          label: 'Average',
          value: LegendValue.Average,
          toolTipContent: 'Shows the average value',
        },
      ],
      onLegendStatsChange,
    });
    expect(screen.queryByRole('button', { name: 'Layout' })).toBeNull();
    fireEvent.click(screen.getByRole('combobox', { name: 'Statistics' }));
    fireEvent.click(screen.getByRole('option', { name: 'Current and last value' }));
    // expect(screen.getByRole('group', { name: 'Layout' })).toBeInTheDocument();
    expect(onLegendStatsChange).toBeCalledWith([LegendValue.CurrentAndLastValue], false);
  });
});
