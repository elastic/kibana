/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { CalendarsListTable } from './table';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToMlLink: jest.fn(),
}));

const calendars = [
  {
    calendar_id: 'farequote-calendar',
    job_ids: ['farequote'],
    description: 'test ',
    events: [],
  },
  {
    calendar_id: 'this-is-a-new-calendar',
    job_ids: ['test'],
    description: 'new calendar',
    events: [],
  },
];

const props = {
  calendarsList: calendars,
  canCreateCalendar: true,
  canDeleteCalendar: true,
  itemsSelected: false,
  loading: false,
  mlNodesAvailable: true,
  onDeleteClick: () => {},
  setSelectedCalendarList: () => {},
};

describe('CalendarsListTable', () => {
  test('renders the table with all calendars', () => {
    const wrapper = shallowWithIntl(<CalendarsListTable {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('New button enabled if permission available', () => {
    const wrapper = mountWithIntl(
      <MemoryRouter>
        <CalendarsListTable {...props} />
      </MemoryRouter>
    );

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(false);
  });

  test('New button disabled if no permission available', () => {
    const disableProps = {
      ...props,
      canCreateCalendar: false,
    };

    const wrapper = mountWithIntl(
      <MemoryRouter>
        <CalendarsListTable {...disableProps} />
      </MemoryRouter>
    );

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });

  test('New button disabled if no ML nodes available', () => {
    const disableProps = {
      ...props,
      mlNodesAvailable: false,
    };

    const wrapper = mountWithIntl(
      <MemoryRouter>
        <CalendarsListTable {...disableProps} />
      </MemoryRouter>
    );

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
