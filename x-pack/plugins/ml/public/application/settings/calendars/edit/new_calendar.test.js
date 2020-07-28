/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../components/navigation_menu', () => ({
  NavigationMenu: () => <div id="mockNavigationMenu" />,
}));
jest.mock('../../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));
jest.mock('../../../license', () => ({
  hasLicenseExpired: () => false,
  isFullLicense: () => false,
}));
jest.mock('../../../capabilities/get_capabilities', () => ({
  getCapabilities: () => {},
}));
jest.mock('../../../ml_nodes_check/check_ml_nodes', () => ({
  mlNodesAvailable: () => true,
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
  },
}));
jest.mock('./utils', () => ({
  getCalendarSettingsData: jest.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolve({
          jobIds: ['test-job-one', 'test-job-2'],
          groupIds: ['test-group-one', 'test-group-two'],
          calendars: [],
        });
      })
  ),
}));
jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { NewCalendar } from './new_calendar';

const calendars = [
  {
    calendar_id: 'farequote-calendar',
    job_ids: ['farequote'],
    description: 'test ',
    events: [
      {
        description: 'Downtime feb 9 2017 10:10 to 10:30',
        start_time: 1486656600000,
        end_time: 1486657800000,
        calendar_id: 'farequote-calendar',
        event_id: 'Ee-YgGcBxHgQWEhCO_xj',
      },
    ],
  },
  {
    calendar_id: 'this-is-a-new-calendar',
    job_ids: ['test'],
    description: 'new calendar',
    events: [
      {
        description: 'New event!',
        start_time: 1544076000000,
        end_time: 1544162400000,
        calendar_id: 'this-is-a-new-calendar',
        event_id: 'ehWKhGcBqHkXuWNrIrSV',
      },
    ],
  },
];

const props = {
  canCreateCalendar: true,
  canDeleteCalendar: true,
  kibana: {
    services: {
      data: {
        query: {
          timefilter: {
            timefilter: {
              disableTimeRangeSelector: jest.fn(),
              disableAutoRefreshSelector: jest.fn(),
            },
          },
        },
      },
    },
  },
};

describe('NewCalendar', () => {
  test('Renders new calendar form', () => {
    const wrapper = shallowWithIntl(<NewCalendar {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Import modal shown on Import Events button click', () => {
    const wrapper = mountWithIntl(<NewCalendar {...props} />);

    const importButton = wrapper.find('[data-test-subj="mlImportEvents"]');
    const button = importButton.find('EuiButton');
    button.simulate('click');

    expect(wrapper.state('isImportModalVisible')).toBe(true);
  });

  test('New event modal shown on New event button click', () => {
    const wrapper = mountWithIntl(<NewCalendar {...props} />);

    const importButton = wrapper.find('[data-test-subj="mlNewEvent"]');
    const button = importButton.find('EuiButton');
    button.simulate('click');

    expect(wrapper.state('isNewEventModalVisible')).toBe(true);
  });

  test('isDuplicateId returns true if form calendar id already exists in calendars', () => {
    const wrapper = mountWithIntl(<NewCalendar {...props} />);

    const instance = wrapper.instance();
    instance.setState({
      calendars,
      formCalendarId: calendars[0].calendar_id,
    });
    wrapper.update();
    expect(instance.isDuplicateId()).toBe(true);
  });

  test('Save button is disabled if canCreateCalendar is false', () => {
    const noCreateProps = {
      ...props,
      canCreateCalendar: false,
    };

    const wrapper = mountWithIntl(<NewCalendar {...noCreateProps} />);

    const buttons = wrapper.find('[data-test-subj="mlSaveCalendarButton"]');
    const saveButton = buttons.find('EuiButton');

    expect(saveButton.prop('isDisabled')).toBe(true);
  });
});
