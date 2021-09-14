/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RuleStatusFailedCallOut } from './status_failed_callout';

describe('RuleStatusFailedCallOut', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<RuleStatusFailedCallOut date="date" message="message" />);

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });
  it('renders correctly with optional params', () => {
    const wrapper = shallow(
      <RuleStatusFailedCallOut date="date" message="message" color="warning" />
    );

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });
});
