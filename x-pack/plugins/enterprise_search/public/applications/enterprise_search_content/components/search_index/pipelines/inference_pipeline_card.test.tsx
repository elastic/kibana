/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiHealth, EuiPanel, EuiTitle } from '@elastic/eui';

import { InferencePipelineCard } from './inference_pipeline_card';

export const DEFAULT_VALUES = {
  pipelineName: 'Sample Processor',
  trainedModelName: 'example_trained_model',
  isDeployed: true,
  modelType: 'pytorch',
};

const mockValues = { ...DEFAULT_VALUES };

describe('InfererencePipelineCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
  });
  it('renders the item', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(EuiBadge)).toHaveLength(1);

    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Deployed');
  });

  it('renders an undeployed item', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} isDeployed={false} />);
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Not deployed');
  });
});
