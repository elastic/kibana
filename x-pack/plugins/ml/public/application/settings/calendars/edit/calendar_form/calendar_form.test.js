/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl, mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { CalendarForm } from './calendar_form';

jest.mock('../../../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToMlLink: jest.fn(),
}));
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
  showNewEventModal: jest.fn(),
  isGlobalCalendar: false,
};

describe('CalendarForm', () => {
  test('Renders calendar form', () => {
    const wrapper = shallowWithIntl(<CalendarForm {...testProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('CalendarId shown as title when editing', () => {
    const editProps = {
      ...testProps,
      isEdit: true,
      calendarId: 'test-calendar',
      description: 'test description',
    };
    const wrapper = mountWithIntl(<CalendarForm {...editProps} />);
    const calendarId = wrapper.find('EuiTitle');

    expect(calendarId).toMatchSnapshot();
  });
});
