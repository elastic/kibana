/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { AnomalyDetectionSettingsContext } from './anomaly_detection_settings_context';
import { Settings } from './settings';

jest.mock('../components/navigation_menu', () => ({
  NavigationMenu: () => <div id="mockNavigationMenu" />,
}));

jest.mock('../contexts/kibana', () => ({
  useNotifications: () => {
    return {
      toasts: { addDanger: jest.fn() },
    };
  },
}));

describe('Settings', () => {
  function runCheckButtonsDisabledTest(
    canGetFilters: boolean,
    canCreateFilter: boolean,
    canGetCalendars: boolean,
    canCreateCalendar: boolean,
    isFilterListsMngDisabled: boolean,
    isFilterListCreateDisabled: boolean,
    isCalendarsMngDisabled: boolean,
    isCalendarCreateDisabled: boolean
  ) {
    const wrapper = mountWithIntl(
      <AnomalyDetectionSettingsContext.Provider
        value={{ canGetFilters, canCreateFilter, canGetCalendars, canCreateCalendar }}
      >
        <Settings />
      </AnomalyDetectionSettingsContext.Provider>
    );

    const filterMngButton = wrapper
      .find('[data-test-subj="mlFilterListsMngButton"]')
      .find('EuiButtonEmpty');
    expect(filterMngButton.prop('isDisabled')).toBe(isFilterListsMngDisabled);

    const filterCreateButton = wrapper
      .find('[data-test-subj="mlFilterListsCreateButton"]')
      .find('EuiButtonEmpty');
    expect(filterCreateButton.prop('isDisabled')).toBe(isFilterListCreateDisabled);

    const calendarMngButton = wrapper
      .find('[data-test-subj="mlCalendarsMngButton"]')
      .find('EuiButtonEmpty');
    expect(calendarMngButton.prop('isDisabled')).toBe(isCalendarsMngDisabled);

    const calendarCreateButton = wrapper
      .find('[data-test-subj="mlCalendarsCreateButton"]')
      .find('EuiButtonEmpty');
    expect(calendarCreateButton.prop('isDisabled')).toBe(isCalendarCreateDisabled);
  }

  test('should render settings page with all buttons enabled when full user capabilities', () => {
    runCheckButtonsDisabledTest(true, true, true, true, false, false, false, false);
  });

  test('should disable Filter Lists buttons if filters capabilities are false', () => {
    runCheckButtonsDisabledTest(false, false, true, true, true, true, false, false);
  });

  test('should disable Calendars buttons if calendars capabilities are false', () => {
    runCheckButtonsDisabledTest(true, true, false, false, false, false, true, true);
  });
});
