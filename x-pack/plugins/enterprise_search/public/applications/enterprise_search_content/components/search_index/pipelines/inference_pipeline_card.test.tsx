/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import { InferencePipelineCard, TrainedModelHealthPopover } from './inference_pipeline_card';
import { MODEL_REDACTED_VALUE } from './ml_inference/utils';
import { MLModelTypeBadge } from './ml_model_type_badge';

export const DEFAULT_VALUES: InferencePipeline = {
  modelId: 'sample-bert-ner-model',
  modelState: TrainedModelState.Started,
  pipelineName: 'Sample Processor',
  pipelineReferences: [],
  types: ['pytorch', 'ner'],
  sourceFields: ['title', 'body'],
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
    const title = wrapper.find(EuiTitle).at(0).children();
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
    expect(wrapper.find(EuiText)).toHaveLength(1);
    const title = wrapper.find(EuiTitle).at(0).children();
    expect(title.text()).toBe(DEFAULT_VALUES.pipelineName);
  });
  it('renders model ID as subtitle', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiText)).toHaveLength(2);
    const subtitle = wrapper.find(EuiText).at(0).children();
    expect(subtitle.text()).toBe(DEFAULT_VALUES.modelId);
  });
  it("renders message about redaction instead of model ID if it's redacted", () => {
    const values = {
      ...DEFAULT_VALUES,
      modelId: '',
    };
    const wrapper = shallow(<InferencePipelineCard {...values} />);
    expect(wrapper.find(EuiText)).toHaveLength(2);
    const subtitle = wrapper.find(EuiText).at(0).children();
    expect(subtitle.text()).toBe(MODEL_REDACTED_VALUE);
  });
  it('renders model type as badge', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(MLModelTypeBadge)).toHaveLength(1);
    const badge = wrapper.find(MLModelTypeBadge).render();
    expect(badge.text()).toBe('ner');
  });
  it('does not render model type if model ID is redacted', () => {
    const values = {
      ...DEFAULT_VALUES,
      modelId: '',
    };
    const wrapper = shallow(<InferencePipelineCard {...values} />);
    expect(wrapper.find(MLModelTypeBadge)).toHaveLength(0);
  });
  it('renders source fields', () => {
    const wrapper = shallow(<InferencePipelineCard {...mockValues} />);
    expect(wrapper.find(EuiText)).toHaveLength(2);
    const sourceFields = wrapper.find(EuiText).at(1).children();
    expect(sourceFields.text()).toBe('title, body');
  });
  it('does not render source fields if there are none', () => {
    const values = {
      ...DEFAULT_VALUES,
      sourceFields: undefined,
    };
    const wrapper = shallow(<InferencePipelineCard {...values} />);
    expect(wrapper.find(EuiText)).toHaveLength(1); // Model ID only
  });
});

describe('TrainedModelHealthPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
  });
  it('popover renders fix button when model not deployed', () => {
    const values = {
      ...DEFAULT_VALUES,
      modelState: TrainedModelState.NotDeployed,
    };
    const wrapper = shallow(<TrainedModelHealthPopover {...values} />);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(3);

    const fixButton = wrapper.find(EuiButtonEmpty).at(0);
    expect(fixButton.prop('iconType')).toBe('wrench');
    expect(fixButton.prop('href')).toBe('/app/ml/trained_models');
    expect(fixButton.children().text()).toBe('Fix issue in Trained Models');
  });
  it('popover does not render fix button when model deployed', () => {
    const wrapper = shallow(<TrainedModelHealthPopover {...mockValues} />);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
  });
});
