/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ToolbarButton } from '@kbn/kibana-react-plugin/public';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { FramePublicAPI, VisualizationToolbarProps } from '../../../types';
import { GaugeToolbar } from '.';
import type { GaugeVisualizationState } from '../constants';

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
    return this.wrapper.find('EuiFieldText[data-test-subj="lnsToolbarGaugeLabelMajor"]');
  }
  public get titleSelect() {
    return this.wrapper.find('EuiSelect[data-test-subj="lnsToolbarGaugeLabelMajor-select"]');
  }

  modifyTitle(e: FormEvent) {
    act(() => {
      this.titleLabel.prop('onChange')!(e);
    });
  }

  public get subtitleSelect() {
    return this.wrapper.find('EuiSelect[data-test-subj="lnsToolbarGaugeLabelMinor-select"]');
  }

  public get subtitleLabel() {
    return this.wrapper.find('EuiFieldText[data-test-subj="lnsToolbarGaugeLabelMinor"]');
  }

  modifySubtitle(e: FormEvent) {
    act(() => {
      this.subtitleLabel.prop('onChange')!(e);
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
        labelMajorMode: 'auto',
      },
    };
  });

  it('should reflect state in the UI for default props', async () => {
    harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
    harness.togglePopover();

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
        ticksPosition: 'bands' as const,
        labelMajorMode: 'custom' as const,
        labelMajor: 'new labelMajor',
        labelMinor: 'new labelMinor',
      },
    };

    harness = new Harness(mountWithIntl(<GaugeToolbar {...props} />));
    harness.togglePopover();

    expect(harness.titleLabel.prop('value')).toBe('new labelMajor');
    expect(harness.titleSelect.prop('value')).toBe('custom');
    expect(harness.subtitleLabel.prop('value')).toBe('new labelMinor');
    expect(harness.subtitleSelect.prop('value')).toBe('custom');
  });

  describe('labelMajor', () => {
    it('labelMajor label is disabled if labelMajor is selected to be none', () => {
      defaultProps.state.labelMajorMode = 'none' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.titleSelect.prop('value')).toBe('none');
      expect(harness.titleLabel.prop('disabled')).toBe(true);
      expect(harness.titleLabel.prop('value')).toBe('');
    });
    it('labelMajor mode switches to custom when user starts typing', () => {
      defaultProps.state.labelMajorMode = 'auto' as const;

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.titleSelect.prop('value')).toBe('auto');
      expect(harness.titleLabel.prop('disabled')).toBe(false);
      expect(harness.titleLabel.prop('value')).toBe('');
      harness.modifyTitle({ target: { value: 'labelMajor' } } as unknown as FormEvent);
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
    it('labelMinor label is enabled if labelMinor is string', () => {
      defaultProps.state.labelMinor = 'labelMinor label';

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.subtitleSelect.prop('value')).toBe('custom');
      expect(harness.subtitleLabel.prop('disabled')).toBe(false);
      expect(harness.subtitleLabel.prop('value')).toBe('labelMinor label');
    });
    it('labelMajor mode can switch to custom', () => {
      defaultProps.state.labelMinor = '';

      harness = new Harness(mountWithIntl(<GaugeToolbar {...defaultProps} />));
      harness.togglePopover();

      expect(harness.subtitleSelect.prop('value')).toBe('none');
      expect(harness.subtitleLabel.prop('disabled')).toBe(true);
      expect(harness.subtitleLabel.prop('value')).toBe('');
      harness.modifySubtitle({ target: { value: 'labelMinor label' } } as unknown as FormEvent);
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
