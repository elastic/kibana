/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../../common/mock/timeline_results';
import { useGetAllTimeline, getAllTimeline } from '../../../containers/all';
import { useTimelineStatus } from '../use_timeline_status';
import { OpenTimelineModal } from '.';

jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useNavigation: jest.fn().mockReturnValue({
      getAppUrl: jest.fn(),
      navigateTo: jest.fn(),
    }),
  };
});

jest.mock('../../../containers/all', () => {
  const originalModule = jest.requireActual('../../../containers/all');
  return {
    useGetAllTimeline: jest.fn(),
    getAllTimeline: originalModule.getAllTimeline,
  };
});
jest.mock('../use_timeline_types', () => ({
  useTimelineTypes: jest.fn().mockReturnValue({
    timelineType: 'default',
    timelineTabs: <div />,
    timelineFilters: <div />,
  }),
}));

jest.mock('../use_timeline_status', () => ({
  useTimelineStatus: jest.fn(),
}));

// mock for EuiSelectable's virtualization
jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: { children: (dimensions: { width: number; height: number }) => ReactElement }) =>
      children({ width: 100, height: 500 })
);

describe('OpenTimelineModal', () => {
  const mockInstallPrepackagedTimelines = jest.fn();
  beforeEach(() => {
    (useGetAllTimeline as unknown as jest.Mock).mockReturnValue({
      fetchAllTimeline: jest.fn(),
      timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
      loading: false,
      totalCount: mockOpenTimelineQueryResults.totalCount,
    });
    (useTimelineStatus as unknown as jest.Mock).mockReturnValue({
      timelineStatus: null,
      templateTimelineType: null,
      templateTimelineFilter: <div />,
      installPrepackagedTimelines: mockInstallPrepackagedTimelines,
    });
  });

  afterEach(() => {
    mockInstallPrepackagedTimelines.mockClear();
  });

  test('it renders the expected modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <OpenTimelineModal onClose={jest.fn()} />
      </TestProviders>
    );

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
  });

  test('it installs elastic prebuilt templates', async () => {
    const wrapper = mount(
      <TestProviders>
        <OpenTimelineModal onClose={jest.fn()} />
      </TestProviders>
    );

    wrapper.update();

    expect(mockInstallPrepackagedTimelines).toHaveBeenCalled();
  });
});
