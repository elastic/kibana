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

import { DEFAULT_PAGE_COUNT } from 'x-pack/plugins/secops/public/store/local/timeline/model';
import { createStore, State } from '../../../../store';
import { defaultWidth } from '../../../timeline/body';
import { HostsTable } from './index';
import { mockData } from './index.mock';

describe('Load More Table Component', () => {
  const loadMore = jest.fn();
  const state: State = {
    local: {
      app: {
        notesById: {},
        theme: 'dark',
      },
      hosts: {
        limit: 2,
      },
      uncommonProcesses: {
        limit: 0,
        upperLimit: 0,
      },
      inputs: {
        global: {
          timerange: {
            kind: 'absolute',
            from: 0,
            to: 1,
          },
          query: [],
          policy: {
            kind: 'manual',
            duration: 5000,
          },
        },
      },
      dragAndDrop: {
        dataProviders: {},
      },
      timeline: {
        timelineById: {
          test: {
            activePage: 0,
            id: 'test',
            itemsPerPage: 5,
            dataProviders: [],
            description: '',
            eventIdToNoteIds: {},
            historyIds: [],
            isFavorite: false,
            isLive: false,
            kqlMode: 'filter',
            kqlQuery: '',
            title: '',
            noteIds: [],
            range: '1 Day',
            show: false,
            pageCount: DEFAULT_PAGE_COUNT,
            pinnedEventIds: {},
            itemsPerPageOptions: [5, 10, 20],
            sort: {
              columnId: 'timestamp',
              sortDirection: 'descending',
            },
            width: defaultWidth,
          },
        },
      },
    },
  };

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <HostsTable
            loading={false}
            data={mockData.Hosts.edges}
            totalCount={mockData.Hosts.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Hosts.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Hosts.pageInfo)!}
            loadMore={loadMore}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
