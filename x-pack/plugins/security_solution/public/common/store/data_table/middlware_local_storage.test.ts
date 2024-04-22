/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../mock/match_media';
import { defaultHeaders, createSecuritySolutionStorageMock, createMockStore } from '../../mock';
import { addTableInStorage } from '../../../timelines/containers/local_storage';
import { Direction } from '../../../../common/search_strategy';
import { TableId, dataTableActions } from '@kbn/securitysolution-data-table';

const {
  applyDeltaToColumnWidth,
  removeColumn,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateItemsPerPage,
  updateSort,
  upsertColumn,
} = dataTableActions;

jest.mock('../../../timelines/containers/local_storage');

const addTableInStorageMock = addTableInStorage as jest.Mock;

describe('DataTable localStorage middleware', () => {
  const { storage } = createSecuritySolutionStorageMock();
  let store = createMockStore(undefined, undefined, undefined, storage);

  beforeEach(() => {
    store = createMockStore(undefined, undefined, undefined, storage);
  });

  it('should call the storage method with the most recent table state', () => {
    store.dispatch(updateItemsPerPage({ id: TableId.test, itemsPerPage: 42 }));
    expect(addTableInStorageMock).toHaveBeenCalledWith(
      storage,
      TableId.test,
      expect.objectContaining({
        itemsPerPage: 42,
      })
    );
  });

  it('persist adding / reordering of a column correctly', () => {
    store.dispatch(upsertColumn({ id: TableId.test, index: 1, column: defaultHeaders[0] }));
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persist timeline when removing a column ', async () => {
    store.dispatch(removeColumn({ id: TableId.test, columnId: '@timestamp' }));
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persists resizing of a column', async () => {
    store.dispatch(
      applyDeltaToColumnWidth({ id: TableId.test, columnId: '@timestamp', delta: 80 })
    );
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persist the resetting of the fields', async () => {
    store.dispatch(updateColumns({ id: TableId.test, columns: defaultHeaders }));
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persist items per page', async () => {
    store.dispatch(updateItemsPerPage({ id: TableId.test, itemsPerPage: 50 }));
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persist the sorting of a column', async () => {
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
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persists updates to the column order to local storage', async () => {
    store.dispatch(
      updateColumnOrder({
        columnIds: ['event.severity', '@timestamp', 'event.category'],
        id: TableId.test,
      })
    );
    expect(addTableInStorageMock).toHaveBeenCalled();
  });

  it('persists updates to the column width to local storage', async () => {
    store.dispatch(
      updateColumnWidth({
        columnId: 'event.severity',
        id: TableId.test,
        width: 123,
      })
    );
    expect(addTableInStorageMock).toHaveBeenCalled();
  });
});
