/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));


import { shallow } from 'enzyme';
import React from 'react';
import { CalendarForm } from './calendar_form';

const testProps = {
  calendarId: '',
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

  test('CalendarId and description disabled with default value when editing', () => {
    const editProps = {
      ...testProps,
      isEdit: true,
      calendarId: 'test-calendar',
      description: 'test description',
    };
    const wrapper = shallow(
      <CalendarForm {...editProps} />
    );
    const description = wrapper.find('[name="description"]');
    const calendarId = wrapper.find('[name="calendarId"]');

    expect(description.prop('value')).toEqual(editProps.description);
    expect(calendarId.prop('value')).toEqual(editProps.calendarId);
    expect(description.prop('disabled')).toBe(true);
    expect(calendarId.prop('disabled')).toBe(true);
  });

});
