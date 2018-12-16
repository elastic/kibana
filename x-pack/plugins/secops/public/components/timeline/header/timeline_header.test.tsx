/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { createStore, State } from '../../../store';
import { DEFAULT_PAGE_COUNT } from '../../../store/local/timeline/model';
import { defaultWidth } from '../body';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { TimelineHeader } from './timeline_header';

describe('Header', () => {
  const state: State = {
    local: {
      app: {
        notesById: {},
        theme: 'dark',
      },
      hosts: {
        limit: 2,
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
            itemsPerPage: 25,
            itemsPerPageOptions: [10, 25, 50],
            kqlMode: 'filter',
            kqlQuery: '',
            title: '',
            noteIds: [],
            pageCount: DEFAULT_PAGE_COUNT,
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
    test('it renders the data providers', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <TimelineHeader
              id="foo"
              columnHeaders={[]}
              dataProviders={mockDataProviders}
              onColumnSorted={noop}
              onDataProviderRemoved={noop}
              onFilterChange={noop}
              onRangeSelected={noop}
              onToggleDataProviderEnabled={noop}
              range="1 Day"
              show={true}
              sort={{
                columnId: 'timestamp',
                sortDirection: 'descending',
              }}
              theme="dark"
            />
          </DragDropContext>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });
  });
});
