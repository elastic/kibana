/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));


import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { EventsTable } from './events_table';

const testProps = {
  canCreateCalendar: true,
  eventsList: [{
    calendar_id: 'test-calendar',
    description: 'test description',
    start_time: 1486656600000,
    end_time: 1486657800000,
    event_id: 'test-event-one'
  }],
  onDeleteClick: jest.fn(),
  showSearchBar: false,
  showImportModal: jest.fn(),
  showNewEventModal: jest.fn()
};

describe('EventsTable', () => {

  test('Renders events table with no search bar', () => {
    const wrapper = shallowWithIntl(
      <EventsTable.WrappedComponent {...testProps}/>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('Renders events table with search bar', () => {
    const showSearchBarProps = {
      ...testProps,
      showSearchBar: true,
    };

    const wrapper = shallowWithIntl(
      <EventsTable.WrappedComponent {...showSearchBarProps} />
    );

    expect(wrapper).toMatchSnapshot();
  });

});
