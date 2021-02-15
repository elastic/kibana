/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiEmptyPrompt } from '@elastic/eui';

import { UnavailablePrompt } from './unavailable_prompt';

describe('UnavailablePrompt', () => {
  it('renders', () => {
    const wrapper = shallow(<UnavailablePrompt />);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
