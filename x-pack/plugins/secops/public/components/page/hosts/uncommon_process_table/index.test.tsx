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
import { defaultWidth } from '../../../timeline/body';
import { UncommonProcessTable } from './index';
import { mockData } from './index.mock';

describe('UncommonProcess Table Component', () => {
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
            dataProviders: [],
            description: '',
            eventIdToNoteIds: {},
            historyIds: [],
            id: 'test',
            isFavorite: false,
            isLive: false,
            itemsPerPage: 5,
            itemsPerPageOptions: [5, 10, 20],
            kqlMode: 'filter',
            kqlQuery: '',
            title: '',
            noteIds: [],
            pageCount: 0,
            pinnedEventIds: {},
            range: '1 Day',
            show: false,
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
