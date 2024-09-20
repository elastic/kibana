/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToMlLink: jest.fn(),
}));

jest.mock('../../../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
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

const calendarsMock = [
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

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getCalendarSettingsData: jest.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolve({
          jobIds: ['test-job-one', 'test-job-2'],
          groupIds: ['test-group-one', 'test-group-two'],
          calendars: calendarsMock,
        });
      })
  ),
}));

const mockAddDanger = jest.fn();
const mockKibanaContext = {
  services: {
    docLinks: { links: { ml: { calendars: 'test' } } },
    notifications: { toasts: { addDanger: mockAddDanger, addError: jest.fn() } },
    mlServices: {
      mlApi: {
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
    },
  },
};

const mockReact = React;
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaContext,
      });
    };
    return EnhancedType;
  },
}));

import { NewCalendar } from './new_calendar';

describe('NewCalendar', () => {
  test('Renders new calendar form', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <NewCalendar />
      </IntlProvider>
    );

    expect(getByTestId('mlPageCalendarEdit')).toBeInTheDocument();
  });

  test('Import modal button is disabled', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <NewCalendar />
      </IntlProvider>
    );

    const importEventsButton = getByTestId('mlCalendarImportEventsButton');
    expect(importEventsButton).toBeInTheDocument();
    expect(importEventsButton).toBeDisabled();
  });

  test('New event modal button is disabled', async () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <NewCalendar />
      </IntlProvider>
    );

    const newEventButton = getByTestId('mlCalendarNewEventButton');
    expect(newEventButton).toBeInTheDocument();
    expect(newEventButton).toBeDisabled();
  });

  test('isDuplicateId returns true if form calendar id already exists in calendars', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <IntlProvider locale="en">
        <NewCalendar />
      </IntlProvider>
    );

    const mlCalendarIdFormRow = getByText('Calendar ID');
    expect(mlCalendarIdFormRow).toBeInTheDocument();
    const mlCalendarIdInput = queryByTestId('mlCalendarIdInput');
    expect(mlCalendarIdInput).toBeInTheDocument();

    await waitFor(() => {
      expect(mlCalendarIdInput).toBeEnabled();
    });

    await userEvent.type(mlCalendarIdInput, 'this-is-a-new-calendar');

    await waitFor(() => {
      expect(mlCalendarIdInput).toHaveValue('this-is-a-new-calendar');
    });

    const mlSaveCalendarButton = getByTestId('mlSaveCalendarButton');
    expect(mlSaveCalendarButton).toBeInTheDocument();
    expect(mlSaveCalendarButton).toBeEnabled();

    await userEvent.click(mlSaveCalendarButton);

    expect(mockAddDanger).toHaveBeenCalledWith(
      'Cannot create calendar with id [this-is-a-new-calendar] as it already exists.'
    );
  });
});
