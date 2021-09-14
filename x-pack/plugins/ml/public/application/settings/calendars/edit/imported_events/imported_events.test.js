/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { ImportedEvents } from './imported_events';

const testProps = {
  events: [
    {
      calendar_id: 'test-calendar',
      description: 'test description',
      start_time: 1486656600000,
      end_time: 1486657800000,
      event_id: 'test-event-one',
    },
  ],
  showRecurringWarning: false,
  includePastEvents: false,
  onCheckboxToggle: jest.fn(),
  onEventDelete: jest.fn(),
  canCreateCalendar: true,
};

describe('ImportedEvents', () => {
  test('Renders imported events', () => {
    const wrapper = shallowWithIntl(<ImportedEvents {...testProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
