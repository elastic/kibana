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
import { useFetchBrowserFieldCapabilities } from '../use_fetch_browser_fields_capabilities';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../use_fetch_browser_fields_capabilities');

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
      schema: 'string',
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
      schema: 'string',
    },
  ];
  const hookUseFetchBrowserFieldCapabilities = useFetchBrowserFieldCapabilities as jest.Mock;
  const browserFields: BrowserFields = {
    kibana: {
      fields: {
        ['event.action']: {
          category: 'event',
          name: 'event.action',
          type: 'string',
        },
        ['@timestamp']: {
          category: 'base',
          name: '@timestamp',
          type: 'date',
        },
        ['kibana.alert.duration.us']: {
          category: 'kibana',
          name: 'kibana.alert.duration.us',
          type: 'number',
        },
        ['kibana.alert.reason']: {
          category: 'kibana',
          name: 'kibana.alert.reason',
          type: 'string',
        },
      },
    },
  };

  beforeEach(() => {
    hookUseFetchBrowserFieldCapabilities.mockClear();
    hookUseFetchBrowserFieldCapabilities.mockImplementation(() => [true, browserFields]);

    setItemStorageMock.mockClear();
    storage = { current: new Storage(mockStorage) };
  });

  test('hide all columns with onChangeVisibleColumns', async () => {
    const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onChangeVisibleColumns([]);
    });

    expect(result.current.visibleColumns).toEqual([]);
    expect(result.current.columns).toEqual(defaultColumns);
  });

  test('show all columns with onChangeVisibleColumns', async () => {
    const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onChangeVisibleColumns([]);
    });

    act(() => {
      result.current.onChangeVisibleColumns(defaultColumns.map((dc) => dc.id));
    });
    expect(result.current.visibleColumns).toEqual([
      'event.action',
      '@timestamp',
      'kibana.alert.duration.us',
      'kibana.alert.reason',
    ]);
    expect(result.current.columns).toEqual(defaultColumns);
  });

  test('onColumnResize', async () => {
    const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(() =>
      useColumns({ defaultColumns, featureIds, id, storageAlertsTable, storage })
    );

    act(() => {
      result.current.onColumnResize({ columnId: '@timestamp', width: 100 });
    });

    expect(setItemStorageMock).toHaveBeenCalledWith(
      'useColumnTest',
      '{"columns":[{"id":"event.action","displayAsText":"Alert status","initialWidth":150,"schema":"string"},{"id":"@timestamp","displayAsText":"Last updated","initialWidth":100,"schema":"datetime"},{"id":"kibana.alert.duration.us","displayAsText":"Duration","initialWidth":150,"schema":"numeric"},{"id":"kibana.alert.reason","displayAsText":"Reason","schema":"string"}],"visibleColumns":["event.action","@timestamp","kibana.alert.duration.us","kibana.alert.reason"],"sort":[]}'
    );
    expect(result.current.columns.find((c) => c.id === '@timestamp')).toEqual({
      displayAsText: 'Last updated',
      id: '@timestamp',
      initialWidth: 100,
      schema: 'datetime',
    });
  });
});
