/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { BaseSnoozePanel } from './base_snooze_panel';

describe('BaseSnoozePanel', () => {
  test('should render', () => {
    const wrapper = mountWithIntl(
      <BaseSnoozePanel
        hasTitle
        interval="5d"
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="snoozePanelTitle"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="ruleSnoozeIntervalValue"]').first().props().value
    ).toEqual(5);
    expect(wrapper.find('[data-test-subj="ruleSnoozeIntervalUnit"]').first().props().value).toEqual(
      'd'
    );
    expect(wrapper.find('[data-test-subj="ruleSnoozeCancel"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="ruleAddSchedule"]').exists()).toBeTruthy();
  });
  test('should render without title', () => {
    const wrapper = mountWithIntl(
      <BaseSnoozePanel
        hasTitle={false}
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="snoozePanelTitle"]').exists()).toBeFalsy();
  });
  test('should render with cancel button', () => {
    const wrapper = mountWithIntl(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={true}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleSnoozeCancel"]').exists()).toBeTruthy();
  });
  test('should render a list of scheduled snoozes', () => {
    const wrapper = mountWithIntl(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[
          {
            id: '1',
            duration: 864000,
            rRule: {
              dtstart: '9999-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '2',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
        ]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleAddSchedule"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="ruleRemoveAllSchedules"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleSchedulesListAddButton"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="ruleSchedulesListAddButton"]').first().prop('isDisabled')
    ).toBeFalsy();

    expect(
      wrapper
        .find('[data-test-subj="ruleSchedulesList"]')
        .children()
        .getElements()
        .filter((e) => Boolean(e.key)).length
    ).toEqual(2);
  });
  test('should disable add snooze schedule button if rule has more than 5 schedules', () => {
    const wrapper = mountWithIntl(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[
          {
            id: '1',
            duration: 864000,
            rRule: {
              dtstart: '9999-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '2',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '3',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '4',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '5',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
        ]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="ruleSchedulesListAddButton"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="ruleSchedulesListAddButton"]').first().prop('isDisabled')
    ).toBeTruthy();
  });
});
