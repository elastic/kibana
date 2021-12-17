/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ErrorStatePrompt } from '../../../shared/error_state';

import { ErrorConnecting } from './';

describe('ErrorConnecting', () => {
  it('renders', () => {
    const wrapper = shallow(<ErrorConnecting errorConnectingMessage="I am an error" />);

    const errorStatePrompt = wrapper.find(ErrorStatePrompt);
    expect(errorStatePrompt).toHaveLength(1);
    expect(errorStatePrompt.prop('errorConnectingMessage')).toEqual('I am an error');
  });
});
