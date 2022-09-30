/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiPanel, EuiTitle } from '@elastic/eui';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import { InferencePipelineCard } from './inference_pipeline_card';
import { TrainedModelHealth } from './ml_model_health';

export const DEFAULT_VALUES: InferencePipeline = {
  modelState: TrainedModelState.Started,
  pipelineName: 'Sample Processor',
  types: ['pytorch'],
};

const mockValues = { ...DEFAULT_VALUES };

describe('InferencePipelineCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
  });
  it('renders the item', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(TrainedModelHealth)).toHaveLength(1);
  });
});
