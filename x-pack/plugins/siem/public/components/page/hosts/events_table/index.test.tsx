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

import { apolloClientObservable, mockGlobalState } from '../../../../mock';
import { EcsEdges } from '../../../../graphql/types';
import { createStore, hostsModel, State } from '../../../../store';
import { Columns } from '../../../load_more_table';

import { EventsTable, getEventsColumnsCurated } from '.';
import { mockData } from './mock';
import * as i18n from './translations';

describe('Load More Events Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the events table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <EventsTable
            loading={false}
            data={mockData.Events.edges.map(i => i.node)}
            totalCount={mockData.Events.totalCount}
            tiebreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)}
            loadMore={loadMore}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('columns', () => {
    test('on hosts page, we expect to get all columns', () => {
      expect(getEventsColumnsCurated(hostsModel.HostsType.page).length).toEqual(8);
    });

    test('on host details page, we expect to remove one column', () => {
      const columns = getEventsColumnsCurated(hostsModel.HostsType.details);
      expect(columns.length).toEqual(7);
    });

    test('on host details page, we should not have Host Name column', () => {
      const columns = getEventsColumnsCurated(hostsModel.HostsType.details);
      expect(columns.includes((col: Columns<EcsEdges>) => col.name === i18n.HOST_NAME)).toEqual(
        false
      );
    });
  });
});
