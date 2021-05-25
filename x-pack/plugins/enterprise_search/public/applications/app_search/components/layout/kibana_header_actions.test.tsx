/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { KibanaHeaderActions } from './kibana_header_actions';

describe('KibanaHeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<KibanaHeaderActions />);
    expect(wrapper.find(EuiButtonEmpty).exists()).toBe(true);
  });
});
