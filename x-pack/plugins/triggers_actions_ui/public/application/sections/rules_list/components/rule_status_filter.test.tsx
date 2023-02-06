/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFilterButton, EuiSelectableListItem } from '@elastic/eui';
import { RuleStatusFilter } from './rule_status_filter';

const onChangeMock = jest.fn();

describe('RuleStatusFilter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const wrapper = mountWithIntl(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiSelectableListItem).exists()).toBeFalsy();
    expect(wrapper.find(EuiFilterButton).exists()).toBeTruthy();

    expect(wrapper.find('.euiNotificationBadge').last().text()).toEqual('0');
  });

  it('can open the popover correctly', () => {
    const wrapper = mountWithIntl(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find('[data-test-subj="ruleStateFilterSelect"]').exists()).toBeFalsy();

    wrapper.find(EuiFilterButton).simulate('click');

    const statusItems = wrapper.find(EuiSelectableListItem);
    expect(statusItems.length).toEqual(3);
  });

  it('can select statuses', () => {
    const wrapper = mountWithIntl(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    wrapper.find(EuiFilterButton).simulate('click');

    wrapper.find(EuiSelectableListItem).at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['enabled']);

    wrapper.setProps({
      selectedStatuses: ['enabled'],
    });

    wrapper.find(EuiSelectableListItem).at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith([]);

    wrapper.find(EuiSelectableListItem).at(1).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['enabled', 'disabled']);
  });
});
