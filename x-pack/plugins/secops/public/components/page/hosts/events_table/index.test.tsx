/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';

import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { EventsTable, formatSafely } from './index';
import { mockData } from './mock';

describe('Load More Events Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Events table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <EventsTable
            loading={false}
            data={mockData.Events.edges.map(i => i.event)}
            totalCount={mockData.Events.totalCount}
            tiebreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            loadMore={loadMore}
            startDate={1546878704036}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('formatSafely', () => {
    test('formatSafely happy path', () => {
      const sourceIp = formatSafely('source.ip', mockData.Events.edges[0].event);
      const hostName = formatSafely('host.name', mockData.Events.edges[0].event);

      expect(sourceIp).toBe('10.142.0.6');
      expect(hostName).toBe('siem-general');
    });

    test('formatSafely unhappy path', () => {
      const sourceIp = formatSafely('.ip', mockData.Events.edges[0].event);
      const hostName = formatSafely('.name', mockData.Events.edges[0].event);

      expect(sourceIp).toBe('--');
      expect(hostName).toBe('--');
    });
  });
});
