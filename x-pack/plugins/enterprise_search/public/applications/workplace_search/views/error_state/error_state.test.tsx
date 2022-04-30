/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ErrorStatePrompt } from '../../../shared/error_state';

import { ErrorState } from './';

describe('ErrorState', () => {
  it('renders', () => {
    const wrapper = shallow(<ErrorState />);

    const prompt = wrapper.find(ErrorStatePrompt);
    expect(prompt).toHaveLength(1);
  });
});
