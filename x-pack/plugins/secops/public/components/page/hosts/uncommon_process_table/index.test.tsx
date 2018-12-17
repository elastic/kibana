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

import { createStore, State } from '../../../../store';
import { UncommonProcessTable } from './index';
import { mockData } from './index.mock';

describe('UncommonProcess Table Component', () => {
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
    test('it renders the default Uncommon process table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
