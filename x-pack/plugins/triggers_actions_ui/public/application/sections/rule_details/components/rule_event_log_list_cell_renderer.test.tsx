/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiIcon } from '@elastic/eui';
import { shallow, mount } from 'enzyme';
import {
  RuleEventLogListCellRenderer,
  DEFAULT_DATE_FORMAT,
} from './rule_event_log_list_cell_renderer';
import { RuleEventLogListStatus } from './rule_event_log_list_status';
import { RuleDurationFormat } from '../../rules_list/components/rule_duration_format';

describe('rule_event_log_list_cell_renderer', () => {
  it('renders primitive values correctly', () => {
    const wrapper = shallow(<RuleEventLogListCellRenderer columnId="message" value="test" />);

    expect(wrapper.text()).toEqual('test');
  });

  it('renders undefined correctly', () => {
    const wrapper = shallow(<RuleEventLogListCellRenderer columnId="message" />);

    expect(wrapper.text()).toBeFalsy();
  });

  it('renders date duration correctly', () => {
    const wrapper = shallow(
      <RuleEventLogListCellRenderer columnId="execution_duration" value="100000" />
    );

    expect(wrapper.find(RuleDurationFormat).exists()).toBeTruthy();
    expect(wrapper.find(RuleDurationFormat).props().duration).toEqual(100000);
  });

  it('renders timestamps correctly', () => {
    const time = '2022-03-20T07:40:44-07:00';
    const wrapper = shallow(<RuleEventLogListCellRenderer columnId="timestamp" value={time} />);

    expect(wrapper.text()).toEqual(moment(time).format(DEFAULT_DATE_FORMAT));
  });

  it('renders alert status correctly', () => {
    const wrapper = shallow(<RuleEventLogListCellRenderer columnId="status" value="success" />);

    expect(wrapper.find(RuleEventLogListStatus).exists()).toBeTruthy();
    expect(wrapper.find(RuleEventLogListStatus).props().status).toEqual('success');
  });

  it('unaccounted status will still render, but with the unknown color', () => {
    const wrapper = mount(<RuleEventLogListCellRenderer columnId="status" value="newOutcome" />);

    expect(wrapper.find(RuleEventLogListStatus).exists()).toBeTruthy();
    expect(wrapper.find(RuleEventLogListStatus).text()).toEqual('newOutcome');
    expect(wrapper.find(EuiIcon).props().color).toEqual('gray');
  });
});
