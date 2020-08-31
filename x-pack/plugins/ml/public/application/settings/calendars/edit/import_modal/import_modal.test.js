/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ImportModal } from './import_modal';

const testProps = {
  addImportedEvents: jest.fn(),
  closeImportModal: jest.fn(),
  canCreateCalendar: true,
};

const events = [
  {
    description: 'Downtime feb 9 2017 10:10 to 10:30',
    start_time: 1486656600000,
    end_time: 1486657800000,
    calendar_id: 'farequote-calendar',
    event_id: 'Ee-YgGcBxHgQWEhCO_xj',
  },
  {
    description: 'New event!',
    start_time: 1544076000000,
    end_time: 1544162400000,
    calendar_id: 'this-is-a-new-calendar',
    event_id: 'ehWKhGcBqHkXuWNrIrSV',
  },
];

describe('ImportModal', () => {
  test('Renders import modal', () => {
    const wrapper = shallowWithIntl(<ImportModal {...testProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Deletes selected event from event table', () => {
    const wrapper = mountWithIntl(<ImportModal {...testProps} />);

    const testState = {
      allImportedEvents: events,
      selectedEvents: events,
    };

    const instance = wrapper.instance();

    instance.setState(testState);
    wrapper.update();
    expect(wrapper.state('selectedEvents').length).toBe(2);
    const deleteButton = wrapper.find('[data-test-subj="mlEventDelete"]');
    const button = deleteButton.find('EuiButtonEmpty').first();
    button.simulate('click');

    expect(wrapper.state('selectedEvents').length).toBe(1);
  });
});
