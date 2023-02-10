/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { IToasts } from '@kbn/core/public';
import { EuiFilterButton, EuiSelectable, EuiFilterGroup } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleTagFilter, RuleTagFilterProps } from './rule_tag_filter';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/rule_api', () => ({
  loadRuleTags: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const { loadRuleTags } = jest.requireMock('../../../lib/rule_api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const onChangeMock = jest.fn();

const ruleTags = ['a', 'b', 'c', 'd', 'e', 'f'];

const RuleTagFilterWithProviders: React.FunctionComponent<RuleTagFilterProps> = (
  props
) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <RuleTagFilter {...props} />
    </QueryClientProvider>
  </IntlProvider>
);

describe('rule_tag_filter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
    loadRuleTags.mockResolvedValue({
      ruleTags
    });
    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;

    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  it('renders correctly', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilterWithProviders canLoadRules selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiFilterButton).exists()).toBeTruthy();
    expect(wrapper.find('.euiNotificationBadge').last().text()).toEqual('0');
  });

  it('can open the popover correctly', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilterWithProviders canLoadRules selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find('[data-test-subj="ruleTagFilterSelectable"]').exists()).toBeFalsy();

    wrapper.find(EuiFilterButton).simulate('click');

    expect(wrapper.find('[data-test-subj="ruleTagFilterSelectable"]').exists()).toBeTruthy();
    expect(wrapper.find('li').length).toEqual(ruleTags.length);
  });

  it('can select tags', () => {
    const wrapper = mountWithIntl(
      <RuleTagFilterWithProviders canLoadRules selectedTags={[]} onChange={onChangeMock} />
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
      <RuleTagFilterWithProviders canLoadRules selectedTags={selectedTags} onChange={onChangeMock} />
    );

    wrapper.find(EuiFilterButton).simulate('click');

    expect(wrapper.find(EuiSelectable).props().options.length).toEqual(
      ruleTags.length + selectedTags.length
    );
  });

  it('renders the tag filter with a EuiFilterGroup if isGrouped is false', async () => {
    const wrapper = mountWithIntl(
      <RuleTagFilterWithProviders canLoadRules selectedTags={[]} onChange={onChangeMock} />
    );

    expect(wrapper.find(EuiFilterGroup).exists()).toBeTruthy();

    wrapper.setProps({
      isGrouped: true,
    });

    expect(wrapper.find(EuiFilterGroup).exists()).toBeFalsy();
  });
});
