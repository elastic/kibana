/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonIcon, EuiPanel, EuiTextColor, EuiTitle } from '@elastic/eui';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import { InferencePipelineCard } from './inference_pipeline_card';
import { MLModelTypeBadge } from './ml_model_type_badge';

export const DEFAULT_VALUES: InferencePipeline = {
  modelId: 'sample-bert-ner-model',
  modelState: TrainedModelState.Started,
  pipelineName: 'Sample Processor',
  pipelineReferences: [],
  types: ['pytorch', 'ner'],
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
  });
  it('renders pipeline as title', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    const title = wrapper.find(EuiTitle).dive();
    expect(title.text()).toBe(DEFAULT_VALUES.pipelineName);
  });
  it('renders pipeline as title with unknown model type', () => {
    const values = {
      ...DEFAULT_VALUES,
      types: ['pytorch'],
    };
    const wrapper = shallow(<InferencePipelineCard {...values} />);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    // does not render subtitle
    expect(wrapper.find(EuiTextColor)).toHaveLength(0);
    const title = wrapper.find(EuiTitle).dive();
    expect(title.text()).toBe(DEFAULT_VALUES.pipelineName);
  });
  it('renders model ID as subtitle', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiTextColor)).toHaveLength(1);
    const subtitle = wrapper.find(EuiTextColor).dive();
    expect(subtitle.text()).toBe(DEFAULT_VALUES.modelId);
  });
  it('renders model type as badge', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(MLModelTypeBadge)).toHaveLength(1);
    const badge = wrapper.find(MLModelTypeBadge).render();
    expect(badge.text()).toBe('ner');
  });
  it('renders fix button when model not deployed', () => {
    const values = {
      ...DEFAULT_VALUES,
      modelState: TrainedModelState.NotDeployed,
    };
    const wrapper = shallow(<InferencePipelineCard {...values} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);

    const fixButton = wrapper.find(EuiButtonIcon);
    expect(fixButton.prop('iconType')).toBe('wrench');
    expect(fixButton.prop('href')).toBe('/app/ml/trained_models');
  });
  it('does not render fix button when model deployed', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });
});
