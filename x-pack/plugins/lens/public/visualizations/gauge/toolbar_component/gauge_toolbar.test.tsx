/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { GaugeToolbar } from '.';
import { FramePublicAPI, VisualizationToolbarProps } from '../../../types';
import { ToolbarButton } from 'src/plugins/kibana_react/public';
import { ReactWrapper } from 'enzyme';
import { GaugeVisualizationState } from '../../../../common/expressions';
import { act } from 'react-dom/test-utils';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

class Harness {
  wrapper: ReactWrapper;

  constructor(wrapper: ReactWrapper) {
    this.wrapper = wrapper;
  }

  togglePopover() {
    this.wrapper.find(ToolbarButton).simulate('click');
  }

  public get titleLabel() {
    return this.wrapper.find('EuiFieldText[data-test-subj="lens-toolbar-gauge-title"]');
  }
  public get titleSelect() {
    return this.wrapper.find('EuiSelect[data-test-subj="lens-toolbar-gauge-title-select"]');
  }

  modifyTitle(e: FormEvent) {
    act(() => {
      this.titleLabel.prop('onChange')!(e);
    });
  }

  public get subtitleSelect() {
    return this.wrapper.find('EuiSelect[data-test-subj="lens-toolbar-gauge-subtitle-select"]');
  }

  public get subtitleLabel() {
    return this.wrapper.find('EuiFieldText[data-test-subj="lens-toolbar-gauge-subtitle"]');
  }

  modifySubtitle(e: FormEvent) {
    act(() => {
      this.subtitleLabel.prop('onChange')!(e);
    });
  }
  public get ticksOnColorBandsSwitch() {
    return this.wrapper.find(
      'EuiSwitch[data-test-subj="lens-toolbar-gauge-ticks-position-switch"]'
    );
  }

  toggleTicksPositionSwitch() {
    act(() => {
      this.ticksOnColorBandsSwitch.prop('onChange')!({} as FormEvent);
    });
  }
}

describe('gauge toolbar', () => {
  let harness: Harness;
  let defaultProps: VisualizationToolbarProps<GaugeVisualizationState>;

  beforeEach(() => {
    defaultProps = {
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
        visTitleMode: 'auto',
      },
    };
  });

  it('should reflect state in the UI for default props', async () => {
    harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
    harness.togglePopover();

    expect(harness.ticksOnColorBandsSwitch.prop('checked')).toBe(false);
    expect(harness.titleLabel.prop('value')).toBe('');
    expect(harness.titleSelect.prop('value')).toBe('auto');
    expect(harness.subtitleLabel.prop('value')).toBe('');
    expect(harness.subtitleSelect.prop('value')).toBe('none');
  });
  it('should reflect state in the UI for non-default props', async () => {
    const props = {
      ...defaultProps,
      state: {
        ...defaultProps.state,
        colorMode: 'palette' as const,
        ticksPosition: 'bands' as const,
        visTitleMode: 'custom' as const,
        visTitle: 'new title',
        subtitle: 'new subtitle',
      },
    };

    harness = new Harness(mountWithIntl(<GaugeToolbar {...props} />));
    harness.togglePopover();

    expect(harness.ticksOnColorBandsSwitch.prop('checked')).toBe(true);
    expect(harness.titleLabel.prop('value')).toBe('new title');
    expect(harness.titleSelect.prop('value')).toBe('custom');
    expect(harness.subtitleLabel.prop('value')).toBe('new subtitle');
    expect(harness.subtitleSelect.prop('value')).toBe('custom');
  });
  describe('Ticks position switch', () => {
    it('switch is disabled if colorMode is none', () => {
      defaultProps.state.colorMode = 'none' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.ticksOnColorBandsSwitch.prop('disabled')).toBe(true);
      expect(harness.ticksOnColorBandsSwitch.prop('checked')).toBe(false);
    });
    it('switch is enabled if colorMode is not none', () => {
      defaultProps.state.colorMode = 'palette' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.ticksOnColorBandsSwitch.prop('disabled')).toBe(false);
    });
    it('Ticks position switch updates the state when clicked', () => {
      defaultProps.state.colorMode = 'palette' as const;
      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      harness.toggleTicksPositionSwitch();

      expect(defaultProps.setState).toHaveBeenCalledTimes(1);
      expect(defaultProps.setState).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          ticksPosition: 'bands',
        })
      );
    });
  });

  describe('title', () => {
    it('title label is disabled if title is selected to be none', () => {
      defaultProps.state.visTitleMode = 'none' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.titleSelect.prop('value')).toBe('none');
      expect(harness.titleLabel.prop('disabled')).toBe(true);
      expect(harness.titleLabel.prop('value')).toBe('');
    });
    it('title mode switches to custom when user starts typing', () => {
      defaultProps.state.visTitleMode = 'auto' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.titleSelect.prop('value')).toBe('auto');
      expect(harness.titleLabel.prop('disabled')).toBe(false);
      expect(harness.titleLabel.prop('value')).toBe('');
      harness.modifyTitle({ target: { value: 'title' } } as unknown as FormEvent);
      expect(defaultProps.setState).toHaveBeenCalledTimes(1);
      expect(defaultProps.setState).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          visTitleMode: 'custom',
          visTitle: 'title',
        })
      );
    });
  });
  describe('subtitle', () => {
    it('subtitle label is enabled if subtitle is string', () => {
      defaultProps.state.subtitle = 'subtitle label';

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.subtitleSelect.prop('value')).toBe('custom');
      expect(harness.subtitleLabel.prop('disabled')).toBe(false);
      expect(harness.subtitleLabel.prop('value')).toBe('subtitle label');
    });
    it('title mode can switch to custom', () => {
      defaultProps.state.subtitle = '';

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.subtitleSelect.prop('value')).toBe('none');
      expect(harness.subtitleLabel.prop('disabled')).toBe(true);
      expect(harness.subtitleLabel.prop('value')).toBe('');
      harness.modifySubtitle({ target: { value: 'subtitle label' } } as unknown as FormEvent);
      expect(defaultProps.setState).toHaveBeenCalledTimes(1);
      expect(defaultProps.setState).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          subtitle: 'subtitle label',
        })
      );
    });
  });
});
