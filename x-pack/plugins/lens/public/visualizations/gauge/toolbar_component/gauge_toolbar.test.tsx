/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FramePublicAPI, VisualizationToolbarProps } from '../../../types';
import { GaugeToolbar } from '.';
import type { GaugeVisualizationState } from '../constants';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('gauge toolbar', () => {
  const defaultProps: VisualizationToolbarProps<GaugeVisualizationState> = {
    setState: jest.fn(),
    frame: {} as FramePublicAPI,
    state: {
      layerId: 'layerId',
      layerType: 'data',
      metricAccessor: 'metric-accessor',
      minAccessor: '',
      maxAccessor: '',
      goalAccessor: '',
      shape: 'verticalBullet',
      colorMode: 'none',
      ticksPosition: 'auto',
      labelMajorMode: 'auto',
    },
  };

  beforeEach(() => {
    (defaultProps.setState as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderAxisTicksSettingsAndOpen = async (
    propsOverrides?: Partial<VisualizationToolbarProps<GaugeVisualizationState>>
  ) => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const rtlRender = render(<GaugeToolbar {...defaultProps} {...propsOverrides} />);
    const openPopover = async () =>
      await user.click(screen.getByRole('button', { name: 'Appearance' }));
    await openPopover();
    return {
      ...rtlRender,
    };
  };

  const getTitleLabel = () => screen.getByLabelText('Title');
  const getSubtitleLabel = () => screen.getByLabelText('Subtitle');
  const getTitleSelectValue = () => screen.getByTestId('lnsToolbarGaugeLabelMajor-select');
  const getSubtitleSelectValue = () => screen.getByTestId('lnsToolbarGaugeLabelMinor-select');

  it('should reflect state in the UI for default props', async () => {
    await renderAxisTicksSettingsAndOpen();
    expect(getTitleLabel()).toHaveValue('');
    const titleSelect = getTitleSelectValue();
    expect(titleSelect).toHaveValue('auto');
    expect(getSubtitleLabel()).toHaveValue('');
    const subtitleSelect = getSubtitleSelectValue();
    expect(subtitleSelect).toHaveValue('none');
  });
  it('should reflect state in the UI for non-default props', async () => {
    await renderAxisTicksSettingsAndOpen({
      state: {
        ...defaultProps.state,
        ticksPosition: 'bands' as const,
        labelMajorMode: 'custom' as const,
        labelMajor: 'new labelMajor',
        labelMinor: 'new labelMinor',
      },
    });

    expect(getTitleLabel()).toHaveValue('new labelMajor');
    const titleSelect = getTitleSelectValue();
    expect(titleSelect).toHaveValue('custom');
    expect(getSubtitleLabel()).toHaveValue('new labelMinor');
    const subtitleSelect = getSubtitleSelectValue();
    expect(subtitleSelect).toHaveValue('custom');
  });

  describe('labelMajor', () => {
    it('labelMajor label is disabled if labelMajor is selected to be none', async () => {
      await renderAxisTicksSettingsAndOpen({
        state: {
          ...defaultProps.state,
          labelMajorMode: 'none' as const,
        },
      });
      expect(getTitleLabel()).toHaveValue('');
      expect(getTitleLabel()).toBeDisabled();
      const titleSelect = getTitleSelectValue();
      expect(titleSelect).toHaveValue('none');
    });
    it('labelMajor mode switches to custom when user starts typing', async () => {
      await renderAxisTicksSettingsAndOpen({
        state: {
          ...defaultProps.state,
          labelMajorMode: 'auto' as const,
        },
      });
      const titleSelect = getTitleSelectValue();
      expect(titleSelect).toHaveValue('auto');
      expect(getTitleLabel()).toHaveValue('');
      expect(getTitleLabel()).not.toBeDisabled();

      fireEvent.change(getTitleLabel(), { target: { value: 'labelMajor' } });
      jest.advanceTimersByTime(256);
      expect(getTitleLabel()).toHaveValue('labelMajor');
      const updatedTitleSelect = getTitleSelectValue();
      expect(updatedTitleSelect).toHaveValue('custom');
      expect(defaultProps.setState).toHaveBeenCalledTimes(1);
      expect(defaultProps.setState).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelMajorMode: 'custom',
          labelMajor: 'labelMajor',
        })
      );
    });
  });
  describe('labelMinor', () => {
    it('labelMinor label is enabled if labelMinor is string', async () => {
      await renderAxisTicksSettingsAndOpen({
        state: {
          ...defaultProps.state,
          labelMinor: 'labelMinor label',
        },
      });
      expect(getSubtitleLabel()).toHaveValue('labelMinor label');
      const subtitleSelect = getSubtitleSelectValue();
      expect(subtitleSelect).toHaveValue('custom');
      expect(getSubtitleLabel()).not.toBeDisabled();
    });
    it('labelMajor mode can switch to custom', async () => {
      await renderAxisTicksSettingsAndOpen({
        state: {
          ...defaultProps.state,
          labelMinor: '',
        },
      });
      const subtitleSelect = getSubtitleSelectValue();
      expect(subtitleSelect).toHaveValue('none');
      expect(getSubtitleLabel()).toHaveValue('');
      expect(getSubtitleLabel()).toBeDisabled();

      fireEvent.change(getSubtitleLabel(), { target: { value: 'labelMinor label' } });
      jest.advanceTimersByTime(256);

      expect(defaultProps.setState).toHaveBeenCalledTimes(1);
      expect(defaultProps.setState).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelMinor: 'labelMinor label',
        })
      );
    });
  });
});
