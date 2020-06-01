/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { ThemeProvider } from 'styled-components';

import { wait } from '../../../../common/lib/helpers';
import { TestProviderWithoutDragAndDrop } from '../../../../common/mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../../common/mock/timeline_results';
import { useGetAllTimeline, getAllTimeline } from '../../../containers/all';

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
jest.mock('../use_timeline_types', () => {
  return {
    useTimelineTypes: jest.fn().mockReturnValue({
      timelineType: 'default',
      timelineTabs: <div />,
      timelineFilters: <div />,
    }),
  };
});

describe('OpenTimelineModal', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
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
  });

  test('it renders the expected modal', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModal onClose={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await wait();

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
  });
});
