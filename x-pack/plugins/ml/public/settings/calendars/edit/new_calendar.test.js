/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



jest.mock('../../../privilege/check_privilege', () => ({
  checkPermission: () => true
}));
jest.mock('../../../license/check_license', () => ({
  hasLicenseExpired: () => false
}));
jest.mock('../../../privilege/get_privileges', () => ({
  getPrivileges: () => {}
}));
jest.mock('../../../ml_nodes_check/check_ml_nodes', () => ({
  mlNodesAvailable: () => true
}));
jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));
jest.mock('../../../services/ml_api_service', () => ({
  ml: {
    calendars: () => {
      return Promise.resolve([]);
    },
    jobs: {
      jobsSummary: () => {
        return Promise.resolve([]);
      },
      groups: () => {
        return Promise.resolve([]);
      },
    },
  }
}));
jest.mock('./utils', () => ({
  getCalendarSettingsData: jest.fn().mockImplementation(() => new Promise((resolve) => {
    resolve({
      jobIds: ['test-job-one', 'test-job-2'],
      groupIds: ['test-group-one', 'test-group-two'],
      calendars: []
    });
  })),
}));

import { shallow, mount } from 'enzyme';
import React from 'react';
import { NewCalendar } from './new_calendar';

describe('NewCalendar', () => {

  test('Renders new calendar form', () => {
    const wrapper = shallow(
      <NewCalendar />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('Import modal shown on Import Events button click', () => {
    const wrapper = mount(
      <NewCalendar />
    );

    const importButton = wrapper.find('[data-testid="ml_import_events"]');
    const button = importButton.find('EuiButton');
    button.simulate('click');

    expect(wrapper.state('isImportModalVisible')).toBe(true);
  });

  test('New event modal shown on New event button click', () => {
    const wrapper = mount(
      <NewCalendar />
    );

    const importButton = wrapper.find('[data-testid="ml_new_event"]');
    const button = importButton.find('EuiButton');
    button.simulate('click');

    expect(wrapper.state('isNewEventModalVisible')).toBe(true);
  });

});
