/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFilterButton, EuiSelectable, EuiFilterGroup } from '@elastic/eui';
import { RuleTagFilter } from './rule_tag_filter';

const onChangeMock = jest.fn();

const tags = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('rule_tag_filter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilter tags={tags} selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiFilterButton).exists()).toBeTruthy();
    expect(wrapper.find('.euiNotificationBadge').last().text()).toEqual('0');
  });

  it('can open the popover correctly', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilter tags={tags} selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find('[data-test-subj="ruleTagFilterSelectable"]').exists()).toBeFalsy();

    wrapper.find(EuiFilterButton).simulate('click');

    expect(wrapper.find('[data-test-subj="ruleTagFilterSelectable"]').exists()).toBeTruthy();
    expect(wrapper.find('li').length).toEqual(tags.length);
  });

  it('can select tags', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilter tags={tags} selectedTags={[]} onChange={onChangeMock} />
    );

    wrapper.find(EuiFilterButton).simulate('click');

    wrapper.find('[data-test-subj="ruleTagFilterOption-a"]').at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['a']);

    wrapper.setProps({
      selectedTags: ['a'],
    });

    wrapper.find('[data-test-subj="ruleTagFilterOption-a"]').at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith([]);

    wrapper.find('[data-test-subj="ruleTagFilterOption-b"]').at(0).simulate('click');
    expect(onChangeMock).toHaveBeenCalledWith(['a', 'b']);
  });

  it('renders selected tags even if they get deleted from the tags array', () => {
    const selectedTags = ['g', 'h'];
    const wrapper = mountWithIntl(
      <RuleTagFilter tags={tags} selectedTags={selectedTags} onChange={onChangeMock} />
    );

    wrapper.find(EuiFilterButton).simulate('click');

    expect(wrapper.find(EuiSelectable).props().options.length).toEqual(
      tags.length + selectedTags.length
    );
  });

  it('renders the tag filter with a EuiFilterGroup if isGrouped is false', async () => {
    const wrapper = mountWithIntl(
      <RuleTagFilter tags={tags} selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiFilterGroup).exists()).toBeTruthy();

    wrapper.setProps({
      isGrouped: true,
    });

    expect(wrapper.find(EuiFilterGroup).exists()).toBeFalsy();
  });
});
