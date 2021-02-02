/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../mock/match_media';
import { mockIndexNames, mockIndexPattern, TestProviders } from '../../mock';

import { mockEventViewerResponse, mockEventViewerResponseWithEvents } from './mock';
import { StatefulEventsViewer } from '.';
import { EventsViewer } from './events_viewer';
import { defaultHeaders } from './default_headers';
import { useSourcererScope } from '../../containers/sourcerer';
import { mockBrowserFields, mockDocValueFields } from '../../containers/source/mock';
import { eventsDefaultModel } from './default_model';
import { useMountAppended } from '../../utils/use_mount_appended';
import { inputsModel } from '../../store/inputs';
import { TimelineId } from '../../../../common/types/timeline';
import { KqlMode } from '../../../timelines/store/timeline/model';
import { SortDirection } from '../../../timelines/components/timeline/body/sort';
import { AlertsTableFilterGroup } from '../../../detections/components/alerts_table/alerts_filter_group';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useTimelineEvents } from '../../../timelines/containers';

jest.mock('../../../timelines/components/graph_overlay', () => ({
  GraphOverlay: jest.fn(() => <div />),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useDataGridColumnSorting: jest.fn(),
  };
});
jest.mock('../../../timelines/containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../components/url_state/normalize_time_range.ts');

const mockUseSourcererScope: jest.Mock = useSourcererScope as jest.Mock;
jest.mock('../../containers/sourcerer');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const mockUseTimelineEvents: jest.Mock = useTimelineEvents as jest.Mock;
jest.mock('../../../timelines/containers');

const from = '2019-08-26T22:10:56.791Z';
const to = '2019-08-27T22:10:56.794Z';

const defaultMocks = {
  browserFields: mockBrowserFields,
  docValueFields: mockDocValueFields,
  indexPattern: mockIndexPattern,
  loading: false,
  selectedPatterns: mockIndexNames,
};

const utilityBar = (refetch: inputsModel.Refetch, totalCount: number) => (
  <div data-test-subj="mock-utility-bar" />
);

const eventsViewerDefaultProps = {
  browserFields: {},
  columns: [],
  dataProviders: [],
  deletedEventIds: [],
  docValueFields: [],
  end: to,
  expandedEvent: {},
  filters: [],
  id: TimelineId.detectionsPage,
  indexNames: mockIndexNames,
  indexPattern: mockIndexPattern,
  isLive: false,
  isLoadingIndexPattern: false,
  itemsPerPage: 10,
  itemsPerPageOptions: [],
  kqlMode: 'filter' as KqlMode,
  query: {
    query: '',
    language: 'kql',
  },
  handleCloseExpandedEvent: jest.fn(),
  start: from,
  sort: [
    {
      columnId: 'foo',
      columnType: 'number',
      sortDirection: 'asc' as SortDirection,
    },
  ],
  scopeId: SourcererScopeName.timeline,
  utilityBar,
};

describe('EventsViewer', () => {
  const mount = useMountAppended();

  let testProps = {
    defaultModel: eventsDefaultModel,
    end: to,
    id: 'test-stateful-events-viewer',
    start: from,
    scopeId: SourcererScopeName.timeline,
  };
  beforeEach(() => {
    mockUseTimelineEvents.mockReset();
  });
  beforeAll(() => {
    mockUseSourcererScope.mockImplementation(() => defaultMocks);
  });

  describe('event details', () => {
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponseWithEvents]);
    });

    test('call the right reduce action to show event details', async () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );

      await act(async () => {
        wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      });

      await waitFor(() => {
        expect(mockDispatch).toBeCalledTimes(2);
        expect(mockDispatch.mock.calls[1][0]).toEqual({
          payload: {
            event: {
              eventId: 'yb8TkHYBRgU82_bJu_rY',
              indexName: 'auditbeat-7.10.1-2020.12.18-000001',
            },
            tabType: 'query',
            timelineId: 'test-stateful-events-viewer',
          },
          type: 'x-pack/security_solution/local/timeline/TOGGLE_EXPANDED_EVENT',
        });
      });
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponse]);
    });

    test('it renders the "Showing..." subtitle with the expected event count', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().text()).toEqual(
        'Showing: 12 events'
      );
    });

    test('it renders the Fields Browser as a settings gear', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="show-field-browser"]`).first().exists()).toBe(true);
    });
    // TO DO sourcerer @X
    test('it renders the footer containing the pagination', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="timeline-pagination"]`).first().exists()).toBe(true);
    });

    defaultHeaders.forEach((header) => {
      test(`it renders the ${header.id} default EventsViewer column header`, () => {
        const wrapper = mount(
          <TestProviders>
            <StatefulEventsViewer {...testProps} />
          </TestProviders>
        );

        defaultHeaders.forEach((h) =>
          expect(wrapper.find(`[data-test-subj="header-text-${header.id}"]`).first().exists()).toBe(
            true
          )
        );
      });
    });
  });

  describe('loading', () => {
    beforeAll(() => {
      mockUseSourcererScope.mockImplementation(() => ({ ...defaultMocks, loading: true }));
    });
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponse]);
    });

    test('it does NOT render fetch index pattern is loading', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });

    test('it does NOT render when start is empty', () => {
      testProps = {
        ...testProps,
        start: '',
      };
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });

    test('it does NOT render when end is empty', () => {
      testProps = {
        ...testProps,
        end: '',
      };
      const wrapper = mount(
        <TestProviders>
          <StatefulEventsViewer {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).first().exists()).toBe(
        false
      );
    });
  });

  describe('headerFilterGroup', () => {
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponse]);
    });

    test('it renders the provided headerFilterGroup', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer
            {...eventsViewerDefaultProps}
            graphEventId={undefined}
            headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
          />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="alerts-table-filter-group"]`).exists()).toBe(true);
    });

    test('it has a visible HeaderFilterGroupWrapper when Resolver is NOT showing, because graphEventId is undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer
            {...eventsViewerDefaultProps}
            graphEventId={undefined}
            headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
          />
        </TestProviders>
      );
      expect(
        wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
      ).not.toHaveStyleRule('visibility', 'hidden');
    });

    test('it has a visible HeaderFilterGroupWrapper when Resolver is NOT showing, because graphEventId is an empty string', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer
            {...eventsViewerDefaultProps}
            graphEventId=""
            headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
          />
        </TestProviders>
      );
      expect(
        wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
      ).not.toHaveStyleRule('visibility', 'hidden');
    });

    test('it does NOT have a visible HeaderFilterGroupWrapper when Resolver is showing, because graphEventId is a valid id', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer
            {...eventsViewerDefaultProps}
            graphEventId="a valid id"
            headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
          />
        </TestProviders>
      );
      expect(
        wrapper.find(`[data-test-subj="header-filter-group-wrapper"]`).first()
      ).toHaveStyleRule('visibility', 'hidden');
    });

    test('it (still) renders an invisible headerFilterGroup (to maintain state while hidden) when Resolver is showing, because graphEventId is a valid id', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer
            {...eventsViewerDefaultProps}
            graphEventId="a valid id"
            headerFilterGroup={<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />}
          />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="alerts-table-filter-group"]`).exists()).toBe(true);
    });
  });

  describe('utilityBar', () => {
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponse]);
    });

    test('it renders the provided utilityBar when Resolver is NOT showing, because graphEventId is undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId={undefined} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(true);
    });

    test('it renders the provided utilityBar when Resolver is NOT showing, because graphEventId is an empty string', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId="" />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(true);
    });

    test('it does NOT render the provided utilityBar when Resolver is showing, because graphEventId is a valid id', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId="a valid id" />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="mock-utility-bar"]`).exists()).toBe(false);
    });
  });

  describe('header inspect button', () => {
    beforeEach(() => {
      mockUseTimelineEvents.mockReturnValue([false, mockEventViewerResponse]);
    });

    test('it renders the inspect button when Resolver is NOT showing, because graphEventId is undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId={undefined} />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(true);
    });

    test('it renders the inspect button when Resolver is NOT showing, because graphEventId is an empty string', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId="" />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(true);
    });

    test('it does NOT render the inspect button when Resolver is showing, because graphEventId is a valid id', () => {
      const wrapper = mount(
        <TestProviders>
          <EventsViewer {...eventsViewerDefaultProps} graphEventId="a valid id" />
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="inspect-icon-button"]`).exists()).toBe(false);
    });
  });
});
