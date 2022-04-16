/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '../../mock/formatted_relative';
import { getEmptyValue } from '../empty_value';
import { LastEventIndexKey } from '../../../../common/search_strategy';
import { mockLastEventTimeQuery } from '../../containers/events/last_event_time/mock';

import { useMountAppended } from '../../utils/use_mount_appended';
import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { TestProviders } from '../../mock';

import { LastEventTime } from '.';

jest.mock('../../containers/events/last_event_time', () => ({
  useTimelineLastEventTime: jest.fn(),
}));

describe('Last Event Time Stat', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    (useTimelineLastEventTime as jest.Mock).mockReset();
  });

  test('Loading', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      true,
      {
        lastSeen: null,
        errorMessage: null,
      },
    ]);
    const wrapper = mount(
      <TestProviders>
        <LastEventTime docValueFields={[]} indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    expect(wrapper.html()).toBe(
      '<span class="euiLoadingSpinner euiLoadingSpinner--medium"></span>'
    );
  });
  test('Last seen', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: mockLastEventTimeQuery.lastSeen,
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const wrapper = mount(
      <TestProviders>
        <LastEventTime docValueFields={[]} indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    expect(wrapper.html()).toBe('Last event: <span class="euiToolTipAnchor">20 hours ago</span>');
  });
  test('Bad date time string', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: 'something-invalid',
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const wrapper = mount(
      <TestProviders>
        <LastEventTime docValueFields={[]} indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );

    expect(wrapper.html()).toBe('something-invalid');
  });
  test('Null time string', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: null,
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const wrapper = mount(
      <TestProviders>
        <LastEventTime docValueFields={[]} indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    expect(wrapper.html()).toContain(getEmptyValue());
  });
});
