/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

// we don't have the types for waitFor just yet, so using "as waitFor" for when we do
import { waitFor } from '@testing-library/react';
import '../../../common/mock/match_media';
import {
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
  defaultHeaders,
  createSecuritySolutionStorageMock,
  kibanaObservable,
} from '../../../common/mock';

import { createStore, State } from '../../../common/store';
import {
  removeColumn,
  upsertColumn,
  applyDeltaToColumnWidth,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateItemsPerPage,
  updateSort,
} from './actions';
import { DefaultCellRenderer } from '../../components/timeline/cell_rendering/default_cell_renderer';
import {
  QueryTabContentComponent,
  Props as QueryTabContentComponentProps,
} from '../../components/timeline/query_tab_content';
import { defaultRowRenderers } from '../../components/timeline/body/renderers';
import { mockDataProviders } from '../../components/timeline/data_providers/mock/mock_data_providers';
import { Sort } from '../../components/timeline/body/sort';

import { addTimelineInStorage } from '../../containers/local_storage';
import { isPageTimeline } from './epic_local_storage';
import { TimelineId, TimelineStatus, TimelineTabs } from '../../../../common/types/timeline';
import { Direction } from '../../../../common/search_strategy';

jest.mock('../../containers/local_storage');

const addTimelineInStorageMock = addTimelineInStorage as jest.Mock;

describe('epicLocalStorage', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  let props = {} as QueryTabContentComponentProps;
  const sort: Sort[] = [
    {
      columnId: '@timestamp',
      columnType: 'number',
      sortDirection: Direction.desc,
    },
  ];
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    props = {
      columns: defaultHeaders,
      dataProviders: mockDataProviders,
      end: endDate,
      expandedDetail: {},
      filters: [],
      isLive: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as QueryTabContentComponentProps['kqlMode'],
      kqlQueryExpression: '',
      onEventClosed: jest.fn(),
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      showCallOutUnauthorizedMsg: false,
      showExpandedDetails: false,
      start: startDate,
      status: TimelineStatus.active,
      sort,
      timelineId: 'foo',
      timerangeKind: 'absolute',
      activeTab: TimelineTabs.query,
      show: true,
    };
  });

  it('filters correctly page timelines', () => {
    expect(isPageTimeline(TimelineId.active)).toBe(false);
    expect(isPageTimeline('hosts-page-alerts')).toBe(true);
  });

  it('persist adding / reordering of a column correctly', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(upsertColumn({ id: 'test', index: 1, column: defaultHeaders[0] }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist timeline when removing a column ', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(removeColumn({ id: 'test', columnId: '@timestamp' }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persists resizing of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(applyDeltaToColumnWidth({ id: 'test', columnId: '@timestamp', delta: 80 }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist the resetting of the fields', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(updateColumns({ id: 'test', columns: defaultHeaders }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist items per page', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(updateItemsPerPage({ id: 'test', itemsPerPage: 50 }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist the sorting of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(
      updateSort({
        id: 'test',
        sort: [
          {
            columnId: 'event.severity',
            columnType: 'number',
            sortDirection: Direction.desc,
          },
        ],
      })
    );
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persists updates to the column order to local storage', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(
      updateColumnOrder({
        columnIds: ['event.severity', '@timestamp', 'event.category'],
        id: 'test',
      })
    );
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persists updates to the column width to local storage', async () => {
    shallow(
      <TestProviders store={store}>
        <QueryTabContentComponent {...props} />
      </TestProviders>
    );
    store.dispatch(
      updateColumnWidth({
        columnId: 'event.severity',
        id: 'test',
        width: 123,
      })
    );
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });
});
