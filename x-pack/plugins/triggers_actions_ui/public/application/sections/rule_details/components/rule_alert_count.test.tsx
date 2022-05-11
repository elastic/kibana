/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { RuleAlertCount } from './rule_alert_count';

describe('rule_alert_count', () => {
  it('renders value if version is undefined', () => {
    const wrapper = shallow(<RuleAlertCount value="0" />);

    expect(wrapper.text()).toEqual('0');
  });

  it('renders zero value if version is greater than or equal to 8.3.0', () => {
    const wrapper = shallow(<RuleAlertCount value="0" version="8.3.0" />);

    expect(wrapper.text()).toEqual('0');
  });

  it('renders non-zero value if version is greater than or equal to 8.3.0', () => {
    const wrapper = shallow(<RuleAlertCount value="4" version="8.3.0" />);

    expect(wrapper.text()).toEqual('4');
  });

  it('renders dashes for zero value if version is less than 8.3.0', () => {
    const wrapper = shallow(<RuleAlertCount value="0" version="8.2.9" />);

    expect(wrapper.text()).toEqual('--');
  });

  it('renders non-zero value event if version is less than to 8.3.0', () => {
    const wrapper = shallow(<RuleAlertCount value="5" version="8.2.9" />);

    expect(wrapper.text()).toEqual('5');
  });

  it('renders as is if value is unexpectedly not an integer', () => {
    const wrapper = shallow(<RuleAlertCount value="yo" version="8.2.9" />);

    expect(wrapper.text()).toEqual('yo');
  });
});
