/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { waitFor } from '@testing-library/react';

import { AllRulesUtilityBar } from './utility_bar';

const theme = () => ({ eui: euiDarkVars, darkMode: true });

describe('AllRules', () => {
  it('renders AllRulesUtilityBar total rules and selected rules', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRulesUtilityBar
          userHasNoPermissions={false}
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedRules={1}
          onGetBatchItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="showingRules"]').at(0).text()).toEqual('Showing 4 rules');
    expect(wrapper.find('[data-test-subj="selectedRules"]').at(0).text()).toEqual(
      'Selected 1 rule'
    );
  });

  it('renders utility actions if user has permissions', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRulesUtilityBar
          userHasNoPermissions={false}
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedRules={1}
          onGetBatchItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeTruthy();
  });

  it('renders no utility actions if user has no permissions', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRulesUtilityBar
          userHasNoPermissions
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedRules={1}
          onGetBatchItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeFalsy();
  });

  it('invokes refresh on refresh action click', () => {
    const mockRefresh = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRulesUtilityBar
          userHasNoPermissions={false}
          onRefresh={mockRefresh}
          paginationTotal={4}
          numberSelectedRules={1}
          onGetBatchItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="refreshRulesAction"] button').at(0).simulate('click');

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('invokes onRefreshSwitch when auto refresh switch is clicked', async () => {
    const mockSwitch = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRulesUtilityBar
          userHasNoPermissions={false}
          onRefresh={jest.fn()}
          paginationTotal={4}
          numberSelectedRules={1}
          onGetBatchItemsPopoverContent={jest.fn()}
          isAutoRefreshOn={true}
          onRefreshSwitch={mockSwitch}
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
