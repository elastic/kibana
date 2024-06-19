/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { DataViewContext } from '../../common/contexts/data_view_context';
import { TestProvider } from '../../test/test_provider';
import { CloudSecurityDataTable, CloudSecurityDataTableProps } from './cloud_security_data_table';

const mockDataView = {
  fields: {
    getAll: () => [
      { id: 'field1', name: 'field1', customLabel: 'Label 1', visualizable: true },
      { id: 'field2', name: 'field2', customLabel: 'Label 2', visualizable: true },
    ],
    getByName: (name: string) => ({ id: name }),
  },
  getFieldByName: (name: string) => ({ id: name }),
  getFormatterForField: (name: string) => ({
    convert: (value: string) => value,
  }),
} as any;

const mockDefaultColumns = [{ id: 'field1' }, { id: 'field2' }];

const mockCloudPostureDataTable = {
  setUrlQuery: jest.fn(),
  columnsLocalStorageKey: 'test',
  filters: [],
  onSort: jest.fn(),
  sort: [],
  query: {},
  queryError: undefined,
  pageIndex: 0,
  urlQuery: {},
  setTableOptions: jest.fn(),
  handleUpdateQuery: jest.fn(),
  pageSize: 10,
  setPageSize: jest.fn(),
  onChangeItemsPerPage: jest.fn(),
  onChangePage: jest.fn(),
  onResetFilters: jest.fn(),
  getRowsFromPages: jest.fn(),
} as any;

const mockRows = [
  {
    id: '1',
    raw: {
      field1: 'Label 1',
      field2: 'Label 2',
    },
    flattened: {
      field1: 'Label 1',
      field2: 'Label 2',
    },
  },
] as any;

const renderDataTable = (props: Partial<CloudSecurityDataTableProps> = {}) => {
  const defaultProps: CloudSecurityDataTableProps = {
    isLoading: false,
    defaultColumns: mockDefaultColumns,
    rows: props.rows || mockRows,
    total: 0,
    flyoutComponent: () => <></>,
    cloudPostureDataTable: mockCloudPostureDataTable,
    loadMore: jest.fn(),
    createRuleFn: jest.fn(),
    title: 'Test Table',
  };

  const propsWithDefaults = { ...defaultProps, ...props };

  return render(
    <TestProvider>
      <DataViewContext.Provider value={{ dataView: mockDataView }}>
        <CloudSecurityDataTable {...propsWithDefaults} />
      </DataViewContext.Provider>
    </TestProvider>
  );
};

describe('CloudSecurityDataTable', () => {
  it('renders loading state', () => {
    const { getByTestId } = renderDataTable({ isLoading: true, rows: [] });
    expect(getByTestId('unifiedDataTableLoading')).toBeInTheDocument();
  });

  it('renders empty state when no rows are present', () => {
    const { getByTestId } = renderDataTable({ rows: [] });
    expect(getByTestId('csp:empty-state')).toBeInTheDocument();
  });

  it('renders data table with rows', async () => {
    const { getByTestId, getByText } = renderDataTable({
      total: mockRows.length,
    });

    expect(getByTestId('discoverDocTable')).toBeInTheDocument();
    expect(getByText('Label 1')).toBeInTheDocument();
    expect(getByText('Label 2')).toBeInTheDocument();
  });

  it('renders data table with actions button', async () => {
    const { getByRole } = renderDataTable({
      rows: mockRows,
      total: mockRows.length,
    });

    const showActions = getByRole('button', {
      name: 'More actions',
    });

    expect(showActions).toBeInTheDocument();
  });

  it('renders data table without actions button', async () => {
    const { queryByRole } = renderDataTable({
      createRuleFn: undefined,
      rows: mockRows,
      total: mockRows.length,
    });
    const showActions = queryByRole('button', {
      name: 'More actions',
    });
    expect(showActions).toBeNull();
  });
});
