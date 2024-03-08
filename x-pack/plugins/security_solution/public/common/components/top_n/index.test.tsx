/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';
import '../../mock/match_media';
import { mockBrowserFields } from '../../containers/source/mock';
import { mockGlobalState, TestProviders, mockIndexPattern, createMockStore } from '../../mock';
import type { State } from '../../store';

import type { Props } from './top_n';
import { StatefulTopN } from '.';
import { TimelineId } from '../../../../common/types/timeline';
import { TableId } from '@kbn/securitysolution-data-table';
import { detectionAlertsTables } from './helpers';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
    useLocation: jest.fn().mockReturnValue({ pathname: '/test' }),
  };
});

jest.mock('../link_to');
jest.mock('../../lib/kibana');
jest.mock('../../../timelines/store/actions');
jest.mock('../visualization_actions/actions');
jest.mock('../visualization_actions/lens_embeddable');
const field = 'process.name';

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
            match_phrase: {
              'host.os.name': {
                query: 'Linux',
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
        ...mockGlobalState.timeline.timelineById['timeline-test'],
        id: TimelineId.active,
        dataProviders: [
          {
            id: 'draggable-badge-default-draggable-netflow-renderer-timeline-1-_qpBe3EBD7k-aQQL7v7--_qpBe3EBD7k-aQQL7v7--network_transport-tcp',
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
              match_phrase: {
                'source.port': {
                  query: '30045',
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
        },
      },
    },
  },
};

const store = createMockStore(state);

const testProps = {
  browserFields: mockBrowserFields,
  field,
  indexPattern: mockIndexPattern,
  scopeId: TableId.hostsPageEvents,
  toggleTopN: jest.fn(),
  onFilterAdded: jest.fn(),
};

describe('StatefulTopN', () => {
  describe('rendering globalFilter', () => {
    let wrapper: ReactWrapper;
    const globalFilters = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'signal.rule.id',
          params: {
            query: 'd62249f0-1632-11ec-b035-19607969bc20',
          },
        },
        query: {
          match_phrase: {
            'signal.rule.id': 'd62249f0-1632-11ec-b035-19607969bc20',
          },
        },
      },
    ];
    beforeEach(() => {
      wrapper = mount(
        <TestProviders store={store}>
          <StatefulTopN {...testProps} globalFilters={globalFilters} />
        </TestProviders>
      );
    });

    test(`provides filters from  non Redux state when rendering in alerts table`, () => {
      const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;

      expect(props.filters).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'signal.rule.id',
            params: {
              query: 'd62249f0-1632-11ec-b035-19607969bc20',
            },
          },
          query: {
            match_phrase: {
              'signal.rule.id': 'd62249f0-1632-11ec-b035-19607969bc20',
            },
          },
        },
      ]);
    });
  });

  describe('rendering in a global NON-timeline context', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders store={store}>
          <StatefulTopN {...testProps} />
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
          query: { match_phrase: { 'host.os.name': { query: 'Linux' } } },
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
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders store={store}>
          <StatefulTopN
            {...{
              ...testProps,
              scopeId: TimelineId.active,
            }}
          />
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

  describe('rendering in alerts context', () => {
    detectionAlertsTables.forEach((tableId) => {
      test(`defaults to the 'Alert events' option when rendering in Alerts`, async () => {
        const wrapper = mount(
          <TestProviders store={store}>
            <StatefulTopN
              {...{
                ...testProps,
                scopeId: tableId,
              }}
            />
          </TestProviders>
        );
        await waitFor(() => {
          const props = wrapper.find('[data-test-subj="top-n"]').first().props() as Props;
          expect(props.defaultView).toEqual('alert');
        });
        wrapper.unmount();
      });
    });
  });
});
