/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { act, renderHook } from '@testing-library/react-hooks';

import { useColumns, UseColumnsArgs, UseColumnsResp } from './use_columns';

jest.mock('../../../../../common/lib/kibana');

const setItemStorageMock = jest.fn();
const mockStorage = {
  getItem: jest.fn(),
  setItem: setItemStorageMock,
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('useColumn', () => {
  const id = 'useColumnTest';
  const featureIds: AlertConsumers[] = [AlertConsumers.LOGS, AlertConsumers.APM];
  let storage = { current: new Storage(mockStorage) };
  const storageAlertsTable = {
    current: {
      columns: [],
      visibleColumns: [],
      sort: [],
    },
  };
  const defaultColumns: EuiDataGridColumn[] = [
    {
      id: 'event.action',
      displayAsText: 'Alert status',
      initialWidth: 150,
    },
    {
      id: '@timestamp',
      displayAsText: 'Last updated',
      initialWidth: 250,
      schema: 'datetime',
    },
    {
      id: 'kibana.alert.duration.us',
      displayAsText: 'Duration',
      initialWidth: 150,
      schema: 'numeric',
    },
    {
      id: 'kibana.alert.reason',
      displayAsText: 'Reason',
    },
  ];

  beforeEach(() => {
    setItemStorageMock.mockClear();
    storage = { current: new Storage(mockStorage) };
  });

  test('hide all columns with onChangeVisibleColumns', async () => {
    const { result, waitForNextUpdate } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onChangeVisibleColumns([]);
    });
    await waitForNextUpdate();
    expect(result.current.visibleColumns).toEqual([]);
    expect(result.current.columns).toEqual(defaultColumns);
  });

  test('show all columns with onChangeVisibleColumns', async () => {
    const { result, waitForNextUpdate } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onChangeVisibleColumns([]);
    });

    act(() => {
      result.current.onChangeVisibleColumns(defaultColumns.map((dc) => dc.id));
    });
    await waitForNextUpdate();
    expect(result.current.visibleColumns).toEqual([
      'event.action',
      '@timestamp',
      'kibana.alert.duration.us',
      'kibana.alert.reason',
    ]);
    expect(result.current.columns).toEqual(defaultColumns);
  });

  test('onColumnResize', async () => {
    const { result, waitForNextUpdate } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onColumnResize({ columnId: '@timestamp', width: 100 });
    });

    await waitForNextUpdate();
    expect(setItemStorageMock).toHaveBeenCalledWith(
      'useColumnTest',
      '{"columns":[{"id":"event.action","displayAsText":"Alert status","initialWidth":150},{"id":"@timestamp","displayAsText":"Last updated","initialWidth":100,"schema":"datetime"},{"id":"kibana.alert.duration.us","displayAsText":"Duration","initialWidth":150,"schema":"numeric"},{"id":"kibana.alert.reason","displayAsText":"Reason"}],"visibleColumns":["event.action","@timestamp","kibana.alert.duration.us","kibana.alert.reason"],"sort":[]}'
    );
    expect(result.current.columns.find((c) => c.id === '@timestamp')).toEqual({
      displayAsText: 'Last updated',
      id: '@timestamp',
      initialWidth: 100,
      schema: 'datetime',
    });
  });
});
