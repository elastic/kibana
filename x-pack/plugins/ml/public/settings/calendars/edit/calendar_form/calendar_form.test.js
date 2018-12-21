/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));


import { shallow, mount } from 'enzyme';
import React from 'react';
import { CalendarForm } from './calendar_form';

const testProps = {
  calendarId: '',
  canCreateCalendar: true,
  canDeleteCalendar: true,
  description: '',
  eventsList: [],
  groupIds: [],
  isEdit: false,
  isNewCalendarIdValid: false,
  jobIds: [],
  onCalendarIdChange: jest.fn(),
  onCreate: jest.fn(),
  onCreateGroupOption: jest.fn(),
  onDescriptionChange: jest.fn(),
  onEdit: jest.fn(),
  onEventDelete: jest.fn(),
  onGroupSelection: jest.fn(),
  showImportModal: jest.fn(),
  onJobSelection: jest.fn(),
  saving: false,
  selectedGroupOptions: [],
  selectedJobOptions: [],
  showNewEventModal: jest.fn()
};

describe('CalendarForm', () => {

  test('Renders calendar form', () => {
    const wrapper = shallow(
      <CalendarForm {...testProps}/>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('CalendarId shown as title when editing', () => {
    const editProps = {
      ...testProps,
      isEdit: true,
      calendarId: 'test-calendar',
      description: 'test description',
    };
    const wrapper = mount(
      <CalendarForm {...editProps} />
    );
    const calendarId = wrapper.find('EuiTitle');

    expect(
      calendarId.containsMatchingElement(
        <h1>Calendar test-calendar</h1>
      )
    ).toBeTruthy();
  });

});
