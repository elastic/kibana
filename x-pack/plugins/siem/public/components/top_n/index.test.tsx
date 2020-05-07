/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../containers/source/mock';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import { createKibanaCoreStartMock } from '../../mock/kibana_core';
import { FilterManager } from '../../../../../../src/plugins/data/public';
import { createStore, State } from '../../store';
import { TimelineContext, TimelineTypeContext } from '../timeline/timeline_context';

import { Props } from './top_n';
import { ACTIVE_TIMELINE_REDUX_ID, StatefulTopN } from '.';

jest.mock('../../lib/kibana');

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
        from: 1586835969047,
        to: 1586922369047,
      },
    },
  },
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      [ACTIVE_TIMELINE_REDUX_ID]: {
        ...mockGlobalState.timeline.timelineById.test,
        id: ACTIVE_TIMELINE_REDUX_ID,
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
const store = createStore(state, apolloClientObservable);

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
          <StatefulTopN
            browserFields={mockBrowserFields}
            field={field}
            toggleTopN={jest.fn()}
            onFilterAdded={jest.fn()}
            value={value}
          />
        </TestProviders>
      );
    });

    test('it has undefined combinedQueries when rendering in a global context', () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.combinedQueries).toBeUndefined();
    });

    test(`defaults to the 'Raw events' view when rendering in a global context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.defaultView).toEqual('raw');
    });

    test(`provides a 'deleteQuery' when rendering in a global context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.deleteQuery).toBeDefined();
    });

    test(`provides filters from Redux state (inputs > global > filters) when rendering in a global context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

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
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.from).toEqual(0);
    });

    test('provides the global query from Redux state (inputs > global > query) when rendering in a global context', () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.query).toEqual({ query: 'host.name : end*', language: 'kuery' });
    });

    test(`provides a 'global' 'setAbsoluteRangeDatePickerTarget' when rendering in a global context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.setAbsoluteRangeDatePickerTarget).toEqual('global');
    });

    test(`provides 'to' via GlobalTime when rendering in a global context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.to).toEqual(1);
    });
  });

  describe('rendering in a timeline context', () => {
    let filterManager: FilterManager;
    let wrapper: ReactWrapper;

    beforeEach(() => {
      filterManager = new FilterManager(mockUiSettingsForFilterManager);

      wrapper = mount(
        <TestProviders store={store}>
          <TimelineContext.Provider value={{ filterManager, isLoading: false }}>
            <TimelineTypeContext.Provider value={{ id: ACTIVE_TIMELINE_REDUX_ID }}>
              <StatefulTopN
                browserFields={mockBrowserFields}
                field={field}
                toggleTopN={jest.fn()}
                onFilterAdded={jest.fn()}
                value={value}
              />
            </TimelineTypeContext.Provider>
          </TimelineContext.Provider>
        </TestProviders>
      );
    });

    test('it has a combinedQueries value from Redux state composed of the timeline [data providers + kql + filter-bar-filters] when rendering in a timeline context', () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.combinedQueries).toEqual(
        '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"network.transport":"tcp"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1586835969047}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1586922369047}}}],"minimum_should_match":1}}]}}]}},{"match_phrase":{"source.port":{"query":"30045"}}}],"should":[],"must_not":[]}}'
      );
    });

    test('it provides only one view option that matches the `eventType` from redux when rendering in the context of the active timeline', () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.defaultView).toEqual('all');
    });

    test(`provides an undefined 'deleteQuery' when rendering in a timeline context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.deleteQuery).toBeUndefined();
    });

    test(`provides empty filters when rendering in a timeline context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.filters).toEqual([]);
    });

    test(`provides 'from' via redux state (inputs > timeline > timerange) when rendering in a timeline context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.from).toEqual(1586835969047);
    });

    test('provides an empty query when rendering in a timeline context', () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.query).toEqual({ query: '', language: 'kuery' });
    });

    test(`provides a 'timeline' 'setAbsoluteRangeDatePickerTarget' when rendering in a timeline context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.setAbsoluteRangeDatePickerTarget).toEqual('timeline');
    });

    test(`provides 'to' via redux state (inputs > timeline > timerange) when rendering in a timeline context`, () => {
      const props = wrapper
        .find('[data-test-subj="top-n"]')
        .first()
        .props() as Props;

      expect(props.to).toEqual(1586922369047);
    });
  });

  test(`defaults to the 'Signals events' option when rendering in a NON-active timeline context (e.g. the Signals table on the Detections page) when 'documentType' from 'useTimelineTypeContext()' is 'signals'`, () => {
    const filterManager = new FilterManager(mockUiSettingsForFilterManager);
    const wrapper = mount(
      <TestProviders store={store}>
        <TimelineContext.Provider value={{ filterManager, isLoading: false }}>
          <TimelineTypeContext.Provider
            value={{ documentType: 'signals', id: ACTIVE_TIMELINE_REDUX_ID }}
          >
            <StatefulTopN
              browserFields={mockBrowserFields}
              field={field}
              toggleTopN={jest.fn()}
              onFilterAdded={jest.fn()}
              value={value}
            />
          </TimelineTypeContext.Provider>
        </TimelineContext.Provider>
      </TestProviders>
    );

    const props = wrapper
      .find('[data-test-subj="top-n"]')
      .first()
      .props() as Props;

    expect(props.defaultView).toEqual('signal');
  });
});
