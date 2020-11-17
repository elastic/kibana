/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

// we don't have the types for waitFor just yet, so using "as waitFor" for when we do
import { waitFor } from '@testing-library/react';
import '../../../common/mock/match_media';
import {
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  apolloClientObservable,
  TestProviders,
  defaultHeaders,
  createSecuritySolutionStorageMock,
  mockIndexPattern,
  kibanaObservable,
} from '../../../common/mock';

import { createStore, State } from '../../../common/store';
import {
  removeColumn,
  upsertColumn,
  applyDeltaToColumnWidth,
  updateColumns,
  updateItemsPerPage,
  updateSort,
} from './actions';

import {
  TimelineComponent,
  Props as TimelineComponentProps,
} from '../../components/timeline/timeline';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { mockDataProviders } from '../../components/timeline/data_providers/mock/mock_data_providers';
import { Sort } from '../../components/timeline/body/sort';
import { Direction } from '../../../graphql/types';

import { addTimelineInStorage } from '../../containers/local_storage';
import { isPageTimeline } from './epic_local_storage';
import { TimelineId, TimelineStatus, TimelineType } from '../../../../common/types/timeline';

jest.mock('../../containers/local_storage');

const addTimelineInStorageMock = addTimelineInStorage as jest.Mock;

describe('epicLocalStorage', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  let props = {} as TimelineComponentProps;
  const sort: Sort[] = [
    {
      columnId: '@timestamp',
      sortDirection: Direction.desc,
    },
  ];
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  const indexPattern = mockIndexPattern;

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
    props = {
      browserFields: mockBrowserFields,
      columns: defaultHeaders,
      id: 'foo',
      dataProviders: mockDataProviders,
      docValueFields: [],
      end: endDate,
      filters: [],
      indexNames: [],
      indexPattern,
      isLive: false,
      isSaving: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as TimelineComponentProps['kqlMode'],
      kqlQueryExpression: '',
      loadingSourcerer: false,
      onChangeItemsPerPage: jest.fn(),
      onClose: jest.fn(),
      show: true,
      showCallOutUnauthorizedMsg: false,
      start: startDate,
      status: TimelineStatus.active,
      sort,
      timelineType: TimelineType.default,
      timerangeKind: 'absolute',
      toggleColumn: jest.fn(),
      usersViewing: ['elastic'],
    };
  });

  it('filters correctly page timelines', () => {
    expect(isPageTimeline(TimelineId.active)).toBe(false);
    expect(isPageTimeline('hosts-page-alerts')).toBe(true);
  });

  it('persist adding / reordering of a column correctly', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(upsertColumn({ id: 'test', index: 1, column: defaultHeaders[0] }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist timeline when removing a column ', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(removeColumn({ id: 'test', columnId: '@timestamp' }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persists resizing of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(applyDeltaToColumnWidth({ id: 'test', columnId: '@timestamp', delta: 80 }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist the resetting of the fields', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(updateColumns({ id: 'test', columns: defaultHeaders }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist items per page', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(updateItemsPerPage({ id: 'test', itemsPerPage: 50 }));
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });

  it('persist the sorting of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <TimelineComponent {...props} />
      </TestProviders>
    );
    store.dispatch(
      updateSort({
        id: 'test',
        sort: [
          {
            columnId: 'event.severity',
            sortDirection: Direction.desc,
          },
        ],
      })
    );
    await waitFor(() => expect(addTimelineInStorageMock).toHaveBeenCalled());
  });
});
