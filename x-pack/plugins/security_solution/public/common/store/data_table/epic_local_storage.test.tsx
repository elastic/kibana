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
import '../../mock/match_media';
import {
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
  defaultHeaders,
  createSecuritySolutionStorageMock,
  kibanaObservable,
} from '../../mock';

import type { State } from '..';
import { createStore } from '..';
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
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import type { EventsViewerProps } from '../../components/events_viewer';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';

import { addTableInStorage } from '../../../timelines/containers/local_storage';
import { Direction } from '../../../../common/search_strategy';
import { StatefulEventsViewer } from '../../components/events_viewer';
import { eventsDefaultModel } from '../../components/events_viewer/default_model';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import { EntityType } from '@kbn/timelines-plugin/common';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { SourcererScopeName } from '../sourcerer/model';
import { TableId } from '../../../../common/types';

jest.mock('../../../timelines/containers/local_storage');

const addTableInStorageMock = addTableInStorage as jest.Mock;

describe('epicLocalStorage', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  let testProps = {} as EventsViewerProps;

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    const from = '2019-08-27T22:10:56.794Z';
    const to = '2019-08-26T22:10:56.791Z';
    const ACTION_BUTTON_COUNT = 4;

    testProps = {
      defaultCellActions,
      defaultModel: eventsDefaultModel,
      end: to,
      entityType: EntityType.ALERTS,
      tableId: TableId.test,
      leadingControlColumns: getDefaultControlColumn(ACTION_BUTTON_COUNT),
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      sourcererScope: SourcererScopeName.default,
      start: from,
      bulkActions: false,
      hasCrudPermissions: true,
    };
  });

  it('persist adding / reordering of a column correctly', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(upsertColumn({ id: TableId.test, index: 1, column: defaultHeaders[0] }));
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persist timeline when removing a column ', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(removeColumn({ id: TableId.test, columnId: '@timestamp' }));
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persists resizing of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(
      applyDeltaToColumnWidth({ id: TableId.test, columnId: '@timestamp', delta: 80 })
    );
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persist the resetting of the fields', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(updateColumns({ id: TableId.test, columns: defaultHeaders }));
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persist items per page', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(updateItemsPerPage({ id: TableId.test, itemsPerPage: 50 }));
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persist the sorting of a column', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(
      updateSort({
        id: TableId.test,
        sort: [
          {
            columnId: 'event.severity',
            columnType: 'number',
            esTypes: ['long'],
            sortDirection: Direction.desc,
          },
        ],
      })
    );
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persists updates to the column order to local storage', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(
      updateColumnOrder({
        columnIds: ['event.severity', '@timestamp', 'event.category'],
        id: TableId.test,
      })
    );
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });

  it('persists updates to the column width to local storage', async () => {
    shallow(
      <TestProviders store={store}>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    store.dispatch(
      updateColumnWidth({
        columnId: 'event.severity',
        id: TableId.test,
        width: 123,
      })
    );
    await waitFor(() => expect(addTableInStorageMock).toHaveBeenCalled());
  });
});
