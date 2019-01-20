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

import { Direction } from '../../../graphql/types';
import { mockGlobalState } from '../../../mock';
import { createStore, State } from '../../../store';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { TimelineHeader } from './timeline_header';

describe('Header', () => {
  const state: State = mockGlobalState;

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
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onColumnSorted={noop}
              onDataProviderRemoved={noop}
              onFilterChange={noop}
              onRangeSelected={noop}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
              range="1 Day"
              show={true}
              sort={{
                columnId: 'timestamp',
                sortDirection: Direction.descending,
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
