/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { AddMLInferencePipelineButton } from './add_ml_inference_button';

const DEFAULT_VALUES = {
  canUseMlInferencePipeline: true,
  capabilities: {
    ml: {
      canGetTrainedModels: true,
    },
  },
  hasIndexIngestionPipeline: true,
  ingestionMethod: 'crawler',
};

describe('add inference pipeline button', () => {
  const onClick = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('renders button', () => {
    const wrapper = mount(<AddMLInferencePipelineButton onClick={onClick} />);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiToolTip)).toHaveLength(0);
    const button = wrapper.find(EuiButton);
    expect(button.text()).toBe('Add Inference Pipeline');
  });
  it('renders permission tooltip when user cannot get trained models', () => {
    setMockValues({ ...DEFAULT_VALUES, capabilities: {} });
    const wrapper = mount(<AddMLInferencePipelineButton onClick={onClick} />);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
    const tooltip = wrapper.find(EuiToolTip);
    expect(tooltip.prop('content')).toContain('permission');
  });
  it('renders copy & customize tooltip with index pipeline', () => {
    setMockValues({ ...DEFAULT_VALUES, hasIndexIngestionPipeline: false });
    const wrapper = mount(<AddMLInferencePipelineButton onClick={onClick} />);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
    const tooltip = wrapper.find(EuiToolTip);
    expect(tooltip.prop('content')).toContain('copy and customize');
  });
  it('renders disabled tooltip ml is not enabled', () => {
    setMockValues({ ...DEFAULT_VALUES, canUseMlInferencePipeline: false });
    const wrapper = mount(<AddMLInferencePipelineButton onClick={onClick} />);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
    const tooltip = wrapper.find(EuiToolTip);
    expect(tooltip.prop('content')).toContain('enable ML Inference Pipelines');
  });
});
