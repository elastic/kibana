/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { PipelinePanel } from './pipeline_panel';

describe('PipelinePanel', () => {
  const pipeline = {
    extract_binary_content: true,
    name: 'name',
    reduce_whitespace: true,
    run_ml_inference: false,
  };
  it('renders', () => {
    const wrapper = shallow(<PipelinePanel pipeline={pipeline} />);

    expect(wrapper).toMatchSnapshot();
  });
});
