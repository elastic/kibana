/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiTitle } from '@elastic/eui';

import { MLModelTypeBadge } from '../ml_model_type_badge';

import { MLInferencePipelineOption } from './pipeline_select_logic';
import { PipelineSelectOption, PipelineSelectOptionDisabled } from './pipeline_select_option';

import { MODEL_REDACTED_VALUE } from './utils';

describe('PipelineSelectOption', () => {
  const pipeline: MLInferencePipelineOption = {
    disabled: false,
    disabledReason: undefined,
    modelId: 'my-model-id',
    modelType: 'my-model-type',
    pipelineName: 'my-pipeline',
    sourceFields: ['my-source-field1', 'my-source-field2'],
    indexFields: [],
  };
  const label = pipeline.pipelineName;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders pipeline selection option', () => {
    const wrapper = shallow(<PipelineSelectOption label={label} pipeline={pipeline} />);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(MLModelTypeBadge)).toHaveLength(1);
  });
  it('does not render model type badge if model type is unknown', () => {
    const wrapper = shallow(
      <PipelineSelectOption
        label={label}
        pipeline={{
          ...pipeline,
          modelType: '',
        }}
      />
    );
    expect(wrapper.find(MLModelTypeBadge)).toHaveLength(0);
  });
  it("redacts model ID if it's unavailable", () => {
    const wrapper = shallow(
      <PipelineSelectOption
        label={label}
        pipeline={{
          ...pipeline,
          modelId: '',
        }}
      />
    );
    expect(wrapper.find(EuiText)).toHaveLength(2);
    expect(wrapper.find(EuiText).at(0).children().text()).toEqual(MODEL_REDACTED_VALUE);
  });
  it('renders disable warning text if the pipeline is disabled', () => {
    const wrapper = shallow(
      <PipelineSelectOption
        label={label}
        pipeline={{
          ...pipeline,
          disabled: true,
          disabledReason: 'my-reason',
        }}
      />
    );
    expect(wrapper.find(PipelineSelectOptionDisabled)).toHaveLength(1);
  });
});
