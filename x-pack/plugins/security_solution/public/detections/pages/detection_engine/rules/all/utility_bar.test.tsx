/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import { waitFor } from '@testing-library/react';

import { AllRulesUtilityBar } from './utility_bar';
import { getMockTheme } from '../../../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: { euiBreakpoints: { l: '1200px' }, paddingSizes: { m: '10px' } },
});

describe('AllRules', () => {
  it('renders AllRulesUtilityBar total rules and selected rules', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          hasBulkActions
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="showingRules"]').at(0).text()).toEqual('Showing 4 rules');
    expect(wrapper.find('[data-test-subj="selectedRules"]').at(0).text()).toEqual(
      'Selected 1 rule'
    );
  });

  it('does not render total selected and bulk actions when "hasBulkActions" is false', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          hasBulkActions={false}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="showingRules"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="tableBulkActions"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="showingExceptionLists"]').at(0).text()).toEqual(
      'Showing 4 lists'
    );
  });

  it('renders utility actions if user has permissions', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          hasBulkActions
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeTruthy();
  });

  it('renders no utility actions if user has no permissions', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit={false}
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          hasBulkActions
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeFalsy();
  });

  it('invokes refresh on refresh action click', () => {
    const mockRefresh = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit
          onRefresh={mockRefresh}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
          hasBulkActions
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="refreshRulesAction"] button').at(0).simulate('click');

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('invokes onRefreshSwitch when auto refresh switch is clicked', async () => {
    const mockSwitch = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AllRulesUtilityBar
          canBulkEdit
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedItems={1}
          onGetBulkItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={mockSwitch}
          hasBulkActions
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="refreshSettings"] button').first().simulate('click');
      wrapper.find('[data-test-subj="refreshSettingsSwitch"] button').first().simulate('click');
      expect(mockSwitch).toHaveBeenCalledTimes(1);
    });
  });
});
