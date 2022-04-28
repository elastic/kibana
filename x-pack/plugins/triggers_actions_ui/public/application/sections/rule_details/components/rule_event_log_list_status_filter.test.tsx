/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';

const onChangeMock = jest.fn();

describe('rule_event_log_list_status_filter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const wrapper = mountWithIntl(
      <RuleEventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiFilterSelectItem).exists()).toBeFalsy();
    expect(wrapper.find(EuiFilterButton).exists()).toBeTruthy();

    expect(wrapper.find('.euiNotificationBadge').text()).toEqual('0');
  });

  it('can open the popover correctly', () => {
    const wrapper = mountWithIntl(
      <RuleEventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
    );

    wrapper.find(EuiFilterButton).simulate('click');

    const statusItems = wrapper.find(EuiFilterSelectItem);
    expect(statusItems.length).toEqual(3);

    statusItems.at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['success']);

    wrapper.setProps({
      selectedOptions: ['success'],
    });

    expect(wrapper.find('.euiNotificationBadge').text()).toEqual('1');

    statusItems.at(1).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['success', 'failure']);

    wrapper.setProps({
      selectedOptions: ['success', 'failure'],
    });

    expect(wrapper.find('.euiNotificationBadge').text()).toEqual('2');

    statusItems.at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['failure']);
  });
});
