/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import React from 'react';
import { useSelector } from 'react-redux';

import { TestProviders, mockTimelineModel } from '../../../../../common/mock';
import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../constants';
import { Actions } from '.';

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useSelector: jest.fn(),
  };
});

describe('Actions', () => {
  (useSelector as jest.Mock).mockReturnValue(mockTimelineModel);

  test('it renders a checkbox for selecting the event when `showCheckboxes` is `true`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          checked={false}
          expanded={false}
          eventId="abc"
          loading={false}
          loadingEventIds={[]}
          onEventToggled={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={true}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toEqual(true);
  });

  test('it does NOT render a checkbox for selecting the event when `showCheckboxes` is `false`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          checked={false}
          expanded={false}
          eventId="abc"
          loading={false}
          loadingEventIds={[]}
          onEventToggled={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });

  test('it renders a button for expanding the event', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          checked={false}
          expanded={false}
          eventId="abc"
          loading={false}
          loadingEventIds={[]}
          onEventToggled={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="expand-event"]').exists()).toEqual(true);
  });

  test('it invokes onEventToggled when the button to expand an event is clicked', () => {
    const onEventToggled = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          checked={false}
          expanded={false}
          eventId="abc"
          loading={false}
          loadingEventIds={[]}
          onEventToggled={onEventToggled}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="expand-event"]').first().simulate('click');

    expect(onEventToggled).toBeCalled();
  });
});
