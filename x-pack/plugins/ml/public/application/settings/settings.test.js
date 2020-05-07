/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { Settings } from './settings';

jest.mock('../components/navigation_menu', () => ({
  NavigationMenu: () => <div id="mockNavigationMenu" />,
}));

describe('Settings', () => {
  test('Renders settings page with all buttons enabled.', () => {
    const wrapper = mountWithIntl(<Settings canGetFilters={true} canGetCalendars={true} />);

    const filterButton = wrapper
      .find('[data-test-subj="ml_filter_lists_button"]')
      .find('EuiButtonEmpty');
    expect(filterButton.prop('isDisabled')).toBe(false);

    const calendarButton = wrapper
      .find('[data-test-subj="ml_calendar_mng_button"]')
      .find('EuiButtonEmpty');
    expect(calendarButton.prop('isDisabled')).toBe(false);
  });

  test('Filter Lists button disabled if canGetFilters is false', () => {
    const wrapper = mountWithIntl(<Settings canGetFilters={false} canGetCalendars={true} />);

    const filterButton = wrapper
      .find('[data-test-subj="ml_filter_lists_button"]')
      .find('EuiButtonEmpty');
    expect(filterButton.prop('isDisabled')).toBe(true);

    const calendarButton = wrapper
      .find('[data-test-subj="ml_calendar_mng_button"]')
      .find('EuiButtonEmpty');
    expect(calendarButton.prop('isDisabled')).toBe(false);
  });

  test('Calendar management button disabled if canGetCalendars is false', () => {
    const wrapper = mountWithIntl(<Settings canGetFilters={true} canGetCalendars={false} />);

    const filterButton = wrapper
      .find('[data-test-subj="ml_filter_lists_button"]')
      .find('EuiButtonEmpty');
    expect(filterButton.prop('isDisabled')).toBe(false);

    const calendarButton = wrapper
      .find('[data-test-subj="ml_calendar_mng_button"]')
      .find('EuiButtonEmpty');
    expect(calendarButton.prop('isDisabled')).toBe(true);
  });
});
