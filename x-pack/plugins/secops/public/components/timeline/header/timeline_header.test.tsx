/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { Direction } from '../../../graphql/types';
import { mockGlobalState } from '../../../mock';
import { createStore, State } from '../../../store';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { TimelineHeader } from './timeline_header';

describe('Header', () => {
  const state: State = mockGlobalState;
  const indexPattern = {
    fields: [
      {
        name: '@timestamp',
        searchable: true,
        type: 'date',
        aggregatable: true,
      },
      {
        name: '@version',
        searchable: true,
        type: 'string',
        aggregatable: true,
      },
      {
        name: 'agent.ephemeral_id',
        searchable: true,
        type: 'string',
        aggregatable: true,
      },
      {
        name: 'agent.hostname',
        searchable: true,
        type: 'string',
        aggregatable: true,
      },
      {
        name: 'agent.id',
        searchable: true,
        type: 'string',
        aggregatable: true,
      },
    ],
    title: 'filebeat-*,auditbeat-*,packetbeat-*',
  };

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the data providers', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContext onDragEnd={noop}>
              <TimelineHeader
                id="foo"
                indexPattern={indexPattern}
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
              />
            </DragDropContext>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });
  });
});
