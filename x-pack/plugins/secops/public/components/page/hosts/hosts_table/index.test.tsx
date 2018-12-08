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

import { HostItem } from '../../../../../common/graphql/types';
import { createStore, State } from '../../../../store';
import { HostsTable } from './index';
import { mockData } from './index.mock';

describe('Load More Table Component', () => {
  const loadMore = jest.fn();
  const state: State = {
    local: {
      hosts: {
        limit: 2,
      },
      dragAndDrop: {
        dataProviders: {},
      },
      timeline: {
        timelineById: {
          test: {
            id: 'test',
            activePage: 0,
            itemsPerPage: 5,
            dataProviders: [],
            range: '1 Day',
            show: false,
            pageCount: 0,
            itemsPerPageOptions: [5, 10, 20],
            sort: {
              columnId: 'timestamp',
              sortDirection: 'descending',
            },
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
            data={mockData.Hosts.edges as HostItem[]}
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
