/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { mockBrowserFields } from '../../containers/source/mock';
import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
  mockIndexPattern,
} from '../../mock';
import { createKibanaCoreStartMock } from '../../mock/kibana_core';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { createStore, State } from '../../store';

import { Props } from './top_n';
import { StatefulTopN } from '.';
import {
  ManageGlobalTimeline,
  getTimelineDefaults,
} from '../../../timelines/components/manage_timeline';
import { TimelineId } from '../../../../common/types/timeline';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../link_to');
jest.mock('../../lib/kibana');
jest.mock('../../../timelines/store/timeline/actions');

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;

const field = 'process.name';
const value = 'nice';

const state: State = {
  ...mockGlobalState,
  inputs: {
    ...mockGlobalState.inputs,
    global: {
      ...mockGlobalState.inputs.global,
      query: {
        query: 'host.name : end*',
        language: 'kuery',
      },
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.os.name',
            params: {
              query: 'Linux',
            },
          },
          query: {
            match: {
              'host.os.name': {
                query: 'Linux',
                type: 'phrase',
              },
            },
          },
        },
      ],
    },
    timeline: {
      ...mockGlobalState.inputs.timeline,
      timerange: {
        kind: 'relative',
        fromStr: 'now-24h',
        toStr: 'now',
        from: '2020-04-14T03:46:09.047Z',
        to: '2020-04-15T03:46:09.047Z',
      },
    },
  },
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById.test,
        id: TimelineId.active,
        dataProviders: [
          {
            id:
              'draggable-badge-default-draggable-netflow-renderer-timeline-1-_qpBe3EBD7k-aQQL7v7--_qpBe3EBD7k-aQQL7v7--network_transport-tcp',
            name: 'tcp',
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'network.transport',
              value: 'tcp',
              operator: ':',
            },
            and: [],
          },
        ],
        eventType: 'all',
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              key: 'source.port',
              negate: false,
              params: {
                query: '30045',
              },
              type: 'phrase',
            },
            query: {
              match: {
                'source.port': {
                  query: '30045',
                  type: 'phrase',
                },
              },
            },
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: 'host.name : *',
            },
            serializedQuery:
              '{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}',
          },
          filterQueryDraft: {
            kind: 'kuery',
            expression: 'host.name : *',
          },
        },
      },
    },
  },
};

const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  state,
  SUB_PLUGINS_REDUCER,
  apolloClientObservable,
  kibanaObservable,
  storage
);

describe('StatefulTopN', () => {
  // Suppress warnings about "react-beautiful-dnd"
  /* eslint-disable no-console */
  const originalError = console.error;
  const originalWarn = console.warn;
  beforeAll(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('rendering in a global NON-timeline context', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders store={store}>
          <ManageGlobalTimeline>
            <StatefulTopN
              browserFields={mockBrowserFields}
              field={field}
              indexPattern={mockIndexPattern}
              indexToAdd={null}
              timelineId={TimelineId.hostsPageExternalAlerts}
              toggleTopN={jest.fn()}
              onFilterAdded={jest.fn()}
              value={value}
            />
          </ManageGlobalTimeline>
        </TestProviders>
      );
    });

    test('it has undefined combinedQueries when rendering in a global context', () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.combinedQueries).toBeUndefined();
    });

    test(`defaults to the 'Raw events' view when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.defaultView).toEqual('raw');
    });

    test(`provides a 'deleteQuery' when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.deleteQuery).toBeDefined();
    });

    test(`provides filters from Redux state (inputs > global > filters) when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.filters).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.os.name',
            params: { query: 'Linux' },
          },
          query: { match: { 'host.os.name': { query: 'Linux', type: 'phrase' } } },
        },
      ]);
    });

    test(`provides 'from' via GlobalTime when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.from).toEqual('2020-07-07T08:20:18.966Z');
    });

    test('provides the global query from Redux state (inputs > global > query) when rendering in a global context', () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.query).toEqual({ query: 'host.name : end*', language: 'kuery' });
    });

    test(`provides a 'global' 'setAbsoluteRangeDatePickerTarget' when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.setAbsoluteRangeDatePickerTarget).toEqual('global');
    });

    test(`provides 'to' via GlobalTime when rendering in a global context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.to).toEqual('2020-07-08T08:20:18.966Z');
    });
  });

  describe('rendering in a timeline context', () => {
    let filterManager: FilterManager;
    let wrapper: ReactWrapper;

    beforeEach(() => {
      filterManager = new FilterManager(mockUiSettingsForFilterManager);
      const manageTimelineForTesting = {
        [TimelineId.active]: {
          ...getTimelineDefaults(TimelineId.active),
          filterManager,
        },
      };
      wrapper = mount(
        <TestProviders store={store}>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <StatefulTopN
              browserFields={mockBrowserFields}
              field={field}
              indexPattern={mockIndexPattern}
              indexToAdd={null}
              timelineId={TimelineId.active}
              toggleTopN={jest.fn()}
              onFilterAdded={jest.fn()}
              value={value}
            />
          </ManageGlobalTimeline>
        </TestProviders>
      );
    });

    test('it has a combinedQueries value from Redux state composed of the timeline [data providers + kql + filter-bar-filters] when rendering in a timeline context', () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.combinedQueries).toEqual(
        '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"network.transport":"tcp"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}},{"match_phrase":{"source.port":{"query":"30045"}}}],"should":[],"must_not":[]}}'
      );
    });

    test('it provides only one view option that matches the `eventType` from redux when rendering in the context of the active timeline', () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.defaultView).toEqual('all');
    });

    test(`provides an undefined 'deleteQuery' when rendering in a timeline context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.deleteQuery).toBeUndefined();
    });

    test(`provides empty filters when rendering in a timeline context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.filters).toEqual([]);
    });

    test(`provides 'from' via redux state (inputs > timeline > timerange) when rendering in a timeline context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.from).toEqual('2020-04-14T03:46:09.047Z');
    });

    test('provides an empty query when rendering in a timeline context', () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.query).toEqual({ query: '', language: 'kuery' });
    });

    test(`provides a 'timeline' 'setAbsoluteRangeDatePickerTarget' when rendering in a timeline context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.setAbsoluteRangeDatePickerTarget).toEqual('timeline');
    });

    test(`provides 'to' via redux state (inputs > timeline > timerange) when rendering in a timeline context`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.to).toEqual('2020-04-15T03:46:09.047Z');
    });
  });

  test(`defaults to the 'Alert events' option when rendering in a NON-active timeline context (e.g. the Alerts table on the Detections page) when 'documentType' from 'useTimelineTypeContext()' is 'alerts'`, () => {
    const filterManager = new FilterManager(mockUiSettingsForFilterManager);

    const manageTimelineForTesting = {
      [TimelineId.active]: {
        ...getTimelineDefaults(TimelineId.active),
        filterManager,
        documentType: 'alerts',
      },
    };

    const wrapper = mount(
      <TestProviders store={store}>
        <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
          <StatefulTopN
            browserFields={mockBrowserFields}
            field={field}
            indexPattern={mockIndexPattern}
            indexToAdd={null}
            timelineId={TimelineId.detectionsPage}
            toggleTopN={jest.fn()}
            onFilterAdded={jest.fn()}
            value={value}
          />
        </ManageGlobalTimeline>
      </TestProviders>
    );

    const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

    expect(props.defaultView).toEqual('alert');
  });
});
