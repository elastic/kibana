/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { RulesTableUtilityBar } from './rules_table_utility_bar';
import { TestProviders } from '../../../../../common/mock';

jest.mock('./rules_table/rules_table_context');

describe('RulesTableUtilityBar', () => {
  it('renders RulesTableUtilityBar total rules and selected rules', () => {
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="showingRules"]').at(0).text()).toEqual(
      'Showing 1-10 of 21 rules'
    );
    expect(wrapper.find('[data-test-subj="selectedRules"]').at(0).text()).toEqual(
      'Selected 1 rule'
    );
  });

  describe('renders correct pagination label when', () => {
    it.each([
      [0, 0, 0, 'Showing 0-0 of 0 rules'],
      [1, 1, 1, 'Showing 1-1 of 1 rule'],
      [1, 10, 21, 'Showing 1-10 of 21 rules'],
      [1, 10, 8, 'Showing 1-8 of 8 rules'],
      [2, 10, 31, 'Showing 11-20 of 31 rules'],
      [4, 10, 31, 'Showing 31-31 of 31 rules'],
      [1, 5, 4, 'Showing 1-4 of 4 rules'],
      [1, 100, 100, 'Showing 1-100 of 100 rules'],
      [2, 100, 101, 'Showing 101-101 of 101 rules'],
    ])(
      'current page is %s, showing %s rules per page and total rules is %s',
      (page, perPage, total, label) => {
        const wrapper = mount(
          <TestProviders>
            <RulesTableUtilityBar
              canBulkEdit
              onRefresh={jest.fn()}
              pagination={{
                page,
                perPage,
                total,
              }}
              numberSelectedItems={1}
              onGetBulkItemsPopoverContent={jest.fn()}
              isAutoRefreshOn={true}
              onRefreshSwitch={jest.fn()}
              onToggleSelectAll={jest.fn()}
            />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="showingRules"]').at(0).text()).toEqual(label);
      }
    );
  });

  it('renders utility actions if user has permissions', () => {
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeTruthy();
  });

  it('renders no utility actions if user has no permissions', () => {
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit={false}
          onRefresh={jest.fn()}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeFalsy();
  });

  it('invokes refresh on refresh action click', () => {
    const mockRefresh = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onRefresh={mockRefresh}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="refreshRulesAction"] button').at(0).simulate('click');

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('invokes onRefreshSwitch when auto refresh switch is clicked if there are not selected items', async () => {
    const mockSwitch = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={0}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={mockSwitch}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="refreshSettings"] button').first().simulate('click');
      wrapper.find('[data-test-subj="refreshSettingsSwitch"] button').first().simulate('click');
      expect(mockSwitch).toHaveBeenCalledTimes(1);
    });
  });

  it('does not invokes onRefreshSwitch when auto refresh switch is clicked if there are selected items', async () => {
    const mockSwitch = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          pagination={{
            page: 1,
            perPage: 10,
            total: 21,
          }}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={mockSwitch}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="refreshSettings"] button').first().simulate('click');
      wrapper.find('[data-test-subj="refreshSettingsSwitch"] button').first().simulate('click');
      expect(mockSwitch).not.toHaveBeenCalled();
    });
  });
});
