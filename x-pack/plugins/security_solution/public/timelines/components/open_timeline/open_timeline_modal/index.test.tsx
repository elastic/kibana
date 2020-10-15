/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React, { ReactElement } from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { TestProviders } from '../../../../common/mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../../common/mock/timeline_results';
import { useGetAllTimeline, getAllTimeline } from '../../../containers/all';
import { useTimelineStatus } from '../use_timeline_status';
import { OpenTimelineModal } from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/utils/apollo_context', () => ({
  useApolloClient: () => ({}),
}));
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
  () => ({
    children,
  }: {
    children: (dimensions: { width: number; height: number }) => ReactElement;
  }) => children({ width: 100, height: 500 })
);

describe('OpenTimelineModal', () => {
  const mockInstallPrepackagedTimelines = jest.fn();
  beforeEach(() => {
    ((useGetAllTimeline as unknown) as jest.Mock).mockReturnValue({
      fetchAllTimeline: jest.fn(),
      timelines: getAllTimeline(
        '',
        mockOpenTimelineQueryResults[0].result.data?.getAllTimeline?.timeline ?? []
      ),
      loading: false,
      totalCount: mockOpenTimelineQueryResults[0].result.data.getAllTimeline.totalCount,
      refetch: jest.fn(),
    });
    ((useTimelineStatus as unknown) as jest.Mock).mockReturnValue({
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
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OpenTimelineModal onClose={jest.fn()} />
        </MockedProvider>
      </TestProviders>
    );

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
  });

  test('it installs elastic prebuilt templates', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OpenTimelineModal onClose={jest.fn()} />
        </MockedProvider>
      </TestProviders>
    );

    wrapper.update();

    expect(mockInstallPrepackagedTimelines).toHaveBeenCalled();
  });
});
