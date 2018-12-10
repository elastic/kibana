/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow, mount } from 'enzyme';
import React from 'react';

import { CalendarsListTable } from './table';


jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));

const calendars = [
  {
    'calendar_id': 'farequote-calendar',
    'job_ids': ['farequote'],
    'description': 'test ',
    'events': [] },
  {
    'calendar_id': 'this-is-a-new-calendar',
    'job_ids': ['test'],
    'description': 'new calendar',
    'events': [] }];

const props = {
  calendarsList: calendars,
  canCreateCalendar: true,
  canDeleteCalendar: true,
  itemsSelected: false,
  loading: false,
  mlNodesAvailable: true,
  onDeleteClick: () => { },
  setSelectedCalendarList: () => { }
};

describe('CalendarsListTable', () => {

  test('renders the table with all calendars', () => {
    const wrapper = shallow(
      <CalendarsListTable {...props} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('New button enabled if permission available', () => {
    const wrapper = mount(
      <CalendarsListTable {...props} />
    );

    const buttons = wrapper.find('[data-testid="new_calendar_button"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(false);
  });

  test('New button disabled if no permission available', () => {
    const disableProps = {
      ...props,
      canCreateCalendar: false
    };

    const wrapper = mount(
      <CalendarsListTable {...disableProps} />
    );

    const buttons = wrapper.find('[data-testid="new_calendar_button"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });


  test('New button disabled if no ML nodes available', () => {
    const disableProps = {
      ...props,
      mlNodesAvailable: false
    };

    const wrapper = mount(
      <CalendarsListTable {...disableProps} />
    );

    const buttons = wrapper.find('[data-testid="new_calendar_button"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });

});
