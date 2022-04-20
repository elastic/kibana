/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { RuleStateFilter } from './rule_state_filter';

const onChangeMock = jest.fn();

describe('rule_state_filter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const wrapper = mountWithIntl(<RuleStateFilter selectedStates={[]} onChange={onChangeMock} />);

    expect(wrapper.find(EuiFilterSelectItem).exists()).toBeFalsy();
    expect(wrapper.find(EuiFilterButton).exists()).toBeTruthy();

    expect(wrapper.find('.euiNotificationBadge').text()).toEqual('0');
  });

  it('can open the popover correctly', () => {
    const wrapper = mountWithIntl(<RuleStateFilter selectedStates={[]} onChange={onChangeMock} />);

    expect(wrapper.find('[data-test-subj="ruleStateFilterSelect"]').exists()).toBeFalsy();

    wrapper.find(EuiFilterButton).simulate('click');

    const statusItems = wrapper.find(EuiFilterSelectItem);
    expect(statusItems.length).toEqual(3);
  });

  it('can select states', () => {
    const wrapper = mountWithIntl(<RuleStateFilter selectedStates={[]} onChange={onChangeMock} />);

    wrapper.find(EuiFilterButton).simulate('click');

    wrapper.find(EuiFilterSelectItem).at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['enabled']);

    wrapper.setProps({
      selectedStates: ['enabled'],
    });

    wrapper.find(EuiFilterSelectItem).at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith([]);

    wrapper.find(EuiFilterSelectItem).at(1).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['enabled', 'disabled']);
  });
});
