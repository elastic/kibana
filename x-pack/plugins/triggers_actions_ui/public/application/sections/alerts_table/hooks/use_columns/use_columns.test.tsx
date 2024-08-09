/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiDataGridColumn } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { act, renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserFields } from '@kbn/alerting-types';
import { testQueryClientConfig } from '@kbn/alerts-ui-shared/src/common/test_utils/test_query_client_config';
import { fetchAlertsFields } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields';
import { useColumns, UseColumnsArgs, UseColumnsResp } from './use_columns';
import { AlertsTableStorage } from '../../alerts_table_state';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields');

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('../../../../../common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

const setItemStorageMock = jest.fn();
const mockStorage = {
  getItem: jest.fn(),
  setItem: setItemStorageMock,
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent = ({ children }) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    {children}
  </QueryClientProvider>
);

const mockFetchAlertsFields = jest.mocked(fetchAlertsFields);
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
mockFetchAlertsFields.mockResolvedValue({ browserFields, fields: [] });

describe('useColumns', () => {
  const id = 'useColumnTest';
  const featureIds: AlertConsumers[] = [AlertConsumers.LOGS, AlertConsumers.APM];
  let storage = { current: new Storage(mockStorage) };

  const getStorageAlertsTableByDefaultColumns = (defaultColumns: EuiDataGridColumn[]) => {
    return {
      current: {
        columns: defaultColumns,
        visibleColumns: defaultColumns.map((col) => col.id),
        sort: [],
      } as AlertsTableStorage,
    };
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

  beforeEach(() => {
    jest.clearAllMocks();
    storage = { current: new Storage(mockStorage) };
    queryClient.clear();
  });

  test('onColumnResize', async () => {
    // storageTable will always be in sync with defualtColumns.
    // it is an invariant. If that is the case, that can be considered an issue
    const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
    const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
      () =>
        useColumns({
          defaultColumns,
          featureIds,
          id,
          storageAlertsTable: localStorageAlertsTable,
          storage,
        }),
      { wrapper }
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

  test("does not fetch alerts fields if they're overridden through the alertsFields prop", () => {
    const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
    const alertsFields = {
      testField: { name: 'testField', type: 'string', searchable: true, aggregatable: true },
    };
    const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
      () =>
        useColumns({
          alertsFields,
          defaultColumns,
          featureIds,
          id,
          storageAlertsTable: localStorageAlertsTable,
          storage,
        }),
      { wrapper }
    );

    expect(mockFetchAlertsFields).not.toHaveBeenCalled();
    expect(result.current.browserFields).toEqual(alertsFields);
  });

  describe('visibleColumns', () => {
    test('hide all columns with onChangeVisibleColumns', async () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      act(() => {
        result.current.onChangeVisibleColumns([]);
      });

      expect(result.current.visibleColumns).toEqual([]);
      expect(result.current.columns).toEqual(defaultColumns);
    });

    test('show all columns with onChangeVisibleColumns', async () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
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

    test('should populate visibleColumns correctly', async () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      expect(result.current.visibleColumns).toMatchObject(defaultColumns.map((col) => col.id));
    });

    test('should change visibleColumns if provided defaultColumns change', async () => {
      let localDefaultColumns = [...defaultColumns];
      let localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(localDefaultColumns);
      const { result, rerender } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns: localDefaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      expect(result.current.visibleColumns).toMatchObject(defaultColumns.map((col) => col.id));

      /*
       *
       * TODO : it looks like when defaultColumn is changed, the storageAlertTable
       * is also changed automatically outside this hook i.e. storageAlertsTable = localStorageColumns ?? defaultColumns
       *
       * ideally everything related to columns should be pulled in this particular hook. So that it is easy
       * to measure the effects based on single set of props. Just by looking at this hook
       * it is impossible to know that defaultColumn and storageAlertsTable both are always in sync and should
       * be kept in sync manually when running tests.
       *
       * */
      localDefaultColumns = localDefaultColumns.slice(0, 3);
      localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(localDefaultColumns);

      rerender();

      expect(result.current.visibleColumns).toMatchObject(localDefaultColumns.map((col) => col.id));
    });
  });

  describe('columns', () => {
    test('should changes the column list when defaultColumns has been updated', async () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result, waitFor } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.columns).toMatchObject(defaultColumns));
    });
  });

  describe('onToggleColumns', () => {
    test('should update the list of columns when on Toggle Columns is called', () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });

      expect(result.current.columns).toMatchObject(defaultColumns.slice(1));
    });

    test('should update the list of visible columns when onToggleColumn is called', async () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      // remove particular column
      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });

      expect(result.current.columns).toMatchObject(defaultColumns.slice(1));

      // make it visible again
      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });

      expect(result.current.columns).toMatchObject(defaultColumns);
    });

    test('should update the column details in the storage when onToggleColumn is called', () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      // remove particular column
      act(() => {
        setItemStorageMock.mockClear();
        result.current.onToggleColumn(defaultColumns[0].id);
      });

      expect(setItemStorageMock).toHaveBeenNthCalledWith(
        1,
        id,
        JSON.stringify({
          columns: defaultColumns.slice(1),
          visibleColumns: defaultColumns.slice(1).map((col) => col.id),
          sort: [],
        })
      );
    });
  });

  describe('onResetColumns', () => {
    test('should restore visible columns defaults', () => {
      const localStorageAlertsTable = getStorageAlertsTableByDefaultColumns(defaultColumns);
      const { result } = renderHook<UseColumnsArgs, UseColumnsResp>(
        () =>
          useColumns({
            defaultColumns,
            featureIds,
            id,
            storageAlertsTable: localStorageAlertsTable,
            storage,
          }),
        { wrapper }
      );

      expect(result.current.visibleColumns).toEqual([
        'event.action',
        '@timestamp',
        'kibana.alert.duration.us',
        'kibana.alert.reason',
      ]);

      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });
      expect(result.current.visibleColumns).not.toContain(['event.action']);

      act(() => {
        result.current.onResetColumns();
      });

      expect(result.current.visibleColumns).toEqual([
        'event.action',
        '@timestamp',
        'kibana.alert.duration.us',
        'kibana.alert.reason',
      ]);
    });
  });
});
