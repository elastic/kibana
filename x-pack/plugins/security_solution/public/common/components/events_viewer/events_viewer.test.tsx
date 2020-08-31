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
// we don't have the types for waitFor just yet, so using "as waitFor" until when we do
import { wait as waitFor } from '@testing-library/react';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { EventsViewer } from './events_viewer';
import { defaultHeaders } from './default_headers';
import { useFetchIndexPatterns } from '../../../detections/containers/detection_engine/rules/fetch_index_patterns';
import { mockBrowserFields, mockDocValueFields } from '../../containers/source/mock';
import { eventsDefaultModel } from './default_model';
import { useMountAppended } from '../../utils/use_mount_appended';
import { inputsModel } from '../../store/inputs';
import { TimelineId } from '../../../../common/types/timeline';
import { KqlMode } from '../../../timelines/store/timeline/model';
import { SortDirection } from '../../../timelines/components/timeline/body/sort';
import { AlertsTableFilterGroup } from '../../../detections/components/alerts_table/alerts_filter_group';

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

const utilityBar = (refetch: inputsModel.Refetch, totalCount: number) => (
  <div data-test-subj="mock-utility-bar" />
);

const exceptionsModal = (refetch: inputsModel.Refetch) => (
  <div data-test-subj="mock-exceptions-modal" />
);

const eventsViewerDefaultProps = {
  browserFields: {},
  columns: [],
  dataProviders: [],
  deletedEventIds: [],
  docValueFields: [],
  end: to,
  filters: [],
  id: TimelineId.detectionsPage,
  indexPattern: mockIndexPattern,
  isLive: false,
  isLoadingIndexPattern: false,
  itemsPerPage: 10,
  itemsPerPageOptions: [],
  kqlMode: 'filter' as KqlMode,
  onChangeItemsPerPage: jest.fn(),
  query: {
    query: '',
    language: 'kql',
  },
  start: from,
  sort: {
    columnId: 'foo',
    sortDirection: 'none' as SortDirection,
  },
  toggleColumn: jest.fn(),
  utilityBar,
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().text()).toEqual(
        'Showing: 12 events'
      );
    });
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="show-field-browser"]`).first().exists()).toBe(true);
    });
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

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="TimelineMoreButton"]`).first().exists()).toBe(true);
    });
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

      await waitFor(() => {
        wrapper.update();

        defaultHeaders.forEach((h) =>
          expect(wrapper.find(`[data-test-subj="header-text-${header.id}"]`).first().exists()).toBe(
            true
          )
        );
      });
    });
  });

  describe('headerFilterGroup', () => {
    test('it renders the provided headerFilterGroup', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              graphEventId={undefined}
              headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="alerts-table-filter-group"]`).exists()).toBe(true);
      });
    });

    test('it has a visible HeaderFilterGroupWrapper when Resolver is NOT showing, because graphEventId is undefined', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              graphEventId={undefined}
              headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(
          wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
        ).not.toHaveStyleRule('visibility', 'hidden');
      });
    });

    test('it has a visible HeaderFilterGroupWrapper when Resolver is NOT showing, because graphEventId is an empty string', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              graphEventId=""
              headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(
          wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
        ).not.toHaveStyleRule('visibility', 'hidden');
      });
    });

    test('it does NOT have a visible HeaderFilterGroupWrapper when Resolver is showing, because graphEventId is a valid id', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              graphEventId="a valid id"
              headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(
          wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
        ).toHaveStyleRule('visibility', 'hidden');
      });
    });

    test('it (still) renders an invisible headerFilterGroup (to maintain state while hidden) when Resolver is showing, because graphEventId is a valid id', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              graphEventId="a valid id"
              headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="alerts-table-filter-group"]`).exists()).toBe(true);
      });
    });
  });

  describe('utilityBar', () => {
    test('it renders the provided utilityBar when Resolver is NOT showing, because graphEventId is undefined', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId={undefined} />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(true);
      });
    });

    test('it renders the provided utilityBar when Resolver is NOT showing, because graphEventId is an empty string', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId="" />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(true);
      });
    });

    test('it does NOT render the provided utilityBar when Resolver is showing, because graphEventId is a valid id', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId="a valid id" />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(false);
      });
    });
  });

  describe('header inspect button', () => {
    test('it renders the inspect button when Resolver is NOT showing, because graphEventId is undefined', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId={undefined} />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(true);
      });
    });

    test('it renders the inspect button when Resolver is NOT showing, because graphEventId is an empty string', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId="" />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(true);
      });
    });

    test('it does NOT render the inspect button when Resolver is showing, because graphEventId is a valid id', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId="a valid id" />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(false);
      });
    });
  });

  describe('exceptions modal', () => {
    test('it renders exception modal if "exceptionsModal" callback exists', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer
              {...eventsViewerDefaultProps}
              exceptionsModal={exceptionsModal}
              graphEventId=""
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="mock-exceptions-modal"]`).exists()).toBeTruthy();
      });
    });

    test('it does not render exception modal if "exceptionModal" callback does not exist', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <EventsViewer {...eventsViewerDefaultProps} graphEventId="" />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        expect(wrapper.find(`[data-test-subj="mock-exceptions-modal"]`).exists()).toBeFalsy();
      });
    });
  });
});
