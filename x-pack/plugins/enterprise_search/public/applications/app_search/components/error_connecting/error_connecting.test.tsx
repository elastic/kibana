/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { ErrorConnecting } from './';

describe('ErrorConnecting', () => {
  it('renders', () => {
    const wrapper = shallow(<ErrorConnecting />);

    expect(wrapper.find(ErrorStatePrompt)).toHaveLength(1);
  });
});
