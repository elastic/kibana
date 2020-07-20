/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../mock/match_media';
import { mockIndexPattern, TestProviders } from '../../mock';
import { wait } from '../../lib/helpers';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { defaultHeaders } from './default_headers';
import { useFetchIndexPatterns } from '../../../detections/containers/detection_engine/rules/fetch_index_patterns';
import { mockBrowserFields, mockDocValueFields } from '../../containers/source/mock';
import { eventsDefaultModel } from './default_model';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../components/url_state/normalize_time_range.ts');

const mockUseFetchIndexPatterns: jest.Mock = useFetchIndexPatterns as jest.Mock;
jest.mock('../../../detections/containers/detection_engine/rules/fetch_index_patterns');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const from = '2019-08-26T22:10:56.791Z';
const to = '2019-08-27T22:10:56.794Z';

const defaultMocks = {
  browserFields: mockBrowserFields,
  indexPatterns: mockIndexPattern,
  docValueFields: mockDocValueFields,
  isLoading: false,
};

describe('EventsViewer', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    mockUseFetchIndexPatterns.mockImplementation(() => [{ ...defaultMocks }]);
  });

  test('it renders the "Showing..." subtitle with the expected event count', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().text()).toEqual(
      'Showing: 12 events'
    );
  });

  test('it does NOT render fetch index pattern is loading', async () => {
    mockUseFetchIndexPatterns.mockImplementation(() => [{ ...defaultMocks, isLoading: true }]);

    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(false);
  });

  test('it does NOT render when start is empty', async () => {
    mockUseFetchIndexPatterns.mockImplementation(() => [{ ...defaultMocks, isLoading: true }]);

    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={''}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(false);
  });

  test('it does NOT render when end is empty', async () => {
    mockUseFetchIndexPatterns.mockImplementation(() => [{ ...defaultMocks, isLoading: true }]);

    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={''}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(false);
  });

  test('it renders the Fields Browser as a settings gear', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="show-field-browser"]`).first().exists()).toBe(true);
  });

  test('it renders the footer containing the Load More button', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="TimelineMoreButton"]`).first().exists()).toBe(true);
  });

  defaultHeaders.forEach((header) => {
    test(`it renders the ${header.id} default EventsViewer column header`, async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <StatefulEventsViewer
              defaultModel={eventsDefaultModel}
              end={to}
              id={'test-stateful-events-viewer'}
              start={from}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      defaultHeaders.forEach((h) =>
        expect(wrapper.find(`[data-test-subj="header-text-${header.id}"]`).first().exists()).toBe(
          true
        )
      );
    });
  });
});
