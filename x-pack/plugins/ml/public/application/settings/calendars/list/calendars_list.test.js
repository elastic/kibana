/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { cloneDeep } from 'lodash';

import { CalendarsList } from './calendars_list';

// Mocking the child components to just assert that they get the data
// received via the async call using mlApi in the main component.
jest.mock('../../../components/help_menu', () => ({
  HelpMenu: ({ docLink }) => <div data-test-subj="mockHelpMenu" data-link={docLink} />,
}));
jest.mock('./header', () => ({
  CalendarsListHeader: ({ totalCount }) => (
    <div data-test-subj="mockCalendarsListHeader">{totalCount}</div>
  ),
}));
jest.mock('./table', () => ({
  CalendarsListTable: ({ calendarsList }) => (
    <div
      data-test-subj="mockCalendarsListTable"
      data-calendar-list={JSON.stringify(calendarsList)}
    />
  ),
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

const mockCalendars = [
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
// need to pass in a copy of mockCalendars because it will be mutated
const mockCalendarsFn = jest.fn(() => Promise.resolve(cloneDeep(mockCalendars)));
const mockKibanaProp = {
  services: {
    docLinks: { links: { ml: { calendars: 'https://calendars' } } },
    mlServices: { mlApi: { calendars: mockCalendarsFn } },
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
    notifications: {
      toasts: {
        addDanger: jest.fn(),
      },
    },
  },
};

const mockReact = React;
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaProp,
      });
    };
    return EnhancedType;
  },
}));

const props = {
  canCreateCalendar: true,
  canDeleteCalendar: true,
};

describe('CalendarsList', () => {
  test('Renders calendar list with calendars', async () => {
    render(<CalendarsList {...props} />);

    await waitFor(() => {
      // Select element by data-test-subj and assert text content
      const calendarsListHeaderElement = screen.getByTestId('mockCalendarsListHeader');
      expect(calendarsListHeaderElement).toHaveTextContent('2');

      // Select element by data-test-subj and assert data attributes
      const calendarsListTableElement = screen.getByTestId('mockCalendarsListTable');
      const calendarListData = JSON.parse(
        calendarsListTableElement.getAttribute('data-calendar-list')
      );

      const expectedCalendarsData = cloneDeep(mockCalendars);
      expectedCalendarsData[0].events_length = 1;
      expectedCalendarsData[0].job_ids_string = 'farequote';
      expectedCalendarsData[1].events_length = 1;
      expectedCalendarsData[1].job_ids_string = 'test';
      expect(calendarListData).toEqual(expectedCalendarsData);
    });
  });
});
