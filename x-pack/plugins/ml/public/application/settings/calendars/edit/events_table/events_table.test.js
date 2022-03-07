/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { EventsTable } from './events_table';

const testProps = {
  canCreateCalendar: true,
  eventsList: [
    {
      calendar_id: 'test-calendar',
      description: 'test description',
      start_time: 1486656600000,
      end_time: 1486657800000,
      event_id: 'test-event-one',
    },
  ],
  onDeleteClick: jest.fn(),
  showSearchBar: false,
  showImportModal: jest.fn(),
  showNewEventModal: jest.fn(),
};

describe('EventsTable', () => {
  test('Renders events table with no search bar', () => {
    const wrapper = shallowWithIntl(<EventsTable {...testProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Renders events table with search bar', () => {
    const showSearchBarProps = {
      ...testProps,
      showSearchBar: true,
    };

    const wrapper = shallowWithIntl(<EventsTable {...showSearchBarProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
