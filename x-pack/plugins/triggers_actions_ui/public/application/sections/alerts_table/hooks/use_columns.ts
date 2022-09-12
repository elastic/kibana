/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useCallback, useState } from 'react';
import { AlertsTableStorage } from '../alerts_table_state';
import {
  BrowserFields,
  useFetchBrowserFieldCapabilities,
} from './use_fetch_browser_fields_capabilities';

interface UseColumnsArgs {
  featureIds: AlertConsumers[];
  storageAlertsTable: React.MutableRefObject<AlertsTableStorage>;
  storage: React.MutableRefObject<IStorageWrapper>;
  id: string;
}

const fieldTypeToDataGridColumnTypeMapper = (fieldType: string) => {
  if (fieldType === 'date') return 'datetime';
  if (fieldType === 'number') return 'numeric';
  if (fieldType === 'object') return 'json';
  return fieldType;
};

/**
 * EUI Data Grid expects the columns to have a property 'schema' defined for proper sorting
 * this schema as its own types as can be check out in the docs so we add it here manually
 * https://eui.elastic.co/#/tabular-content/data-grid-schema-columns
 */
const euiColumnFactory = (
  column: EuiDataGridColumn,
  browserFields: BrowserFields
): EuiDataGridColumn => {
  const browserFieldsProps = getBrowserFieldProps(column.id, browserFields);
  return {
    ...column,
    schema: fieldTypeToDataGridColumnTypeMapper(browserFieldsProps.type),
  };
};

/**
 * Searches in the browser fields object for a specific field
 */
const getBrowserFieldProps = (_columnId: string, browserFields: BrowserFields) => {
  const key = Object.keys(browserFields).find((_key) =>
    Boolean(browserFields[_key].fields[_columnId])
  );

  return key ? browserFields[key].fields[_columnId] : { type: 'string' };
};

/**
 * @param columns Columns to be considered in the alerts table
 * @param browserFields constant object with all field capabilities
 * @returns columns but with the info needed by the data grid to work as expected, e.g sorting
 */
const populateColumns = (
  columns: EuiDataGridColumn[],
  browserFields: BrowserFields
): EuiDataGridColumn[] => {
  return columns.map((column: EuiDataGridColumn) => {
    return euiColumnFactory(column, browserFields);
  });
};

export const useColumns = ({ featureIds, storageAlertsTable, storage, id }: UseColumnsArgs) => {
  const [isBrowserFieldDataLoading, browserFields] = useFetchBrowserFieldCapabilities({
    featureIds,
  });
  const [columns, setColumns] = useState<EuiDataGridColumn[]>(storageAlertsTable.current.columns);
  const [visibleColumns, setVisibleColumns] = useState(
    storageAlertsTable.current.visibleColumns ?? []
  );

  const onColumnsChange = useCallback(
    (newColumns: EuiDataGridColumn[], newVisibleColumns: string[]) => {
      setColumns(newColumns);
      storageAlertsTable.current = {
        ...storageAlertsTable.current,
        columns: newColumns,
        visibleColumns: newVisibleColumns,
      };
      storage.current.set(id, storageAlertsTable.current);
    },
    [id, storage, storageAlertsTable]
  );

  const onChangeVisibleColumns = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns);
      onColumnsChange(
        columns.sort((a, b) => newColumns.indexOf(a.id) - newColumns.indexOf(b.id)),
        newColumns
      );
    },
    [onColumnsChange, columns]
  );

  const onToggleColumn = useCallback(
    (columnId: string): void => {
      const currentIndex = visibleColumns.indexOf(columnId);
      const newColumnIds =
        currentIndex >= 0
          ? [...visibleColumns.slice(0, currentIndex), ...visibleColumns.slice(currentIndex + 1)]
          : [...visibleColumns, columnId];

      const newColumns = populateColumns(
        newColumnIds.map((_columnId) => euiColumnFactory({ id: _columnId }, browserFields)),
        browserFields
      );
      onChangeVisibleColumns(newColumnIds);
      onColumnsChange(newColumns, newColumnIds);
    },
    [browserFields, onChangeVisibleColumns, onColumnsChange, visibleColumns]
  );

  const onResetColumns = useCallback(() => {
    return onChangeVisibleColumns(columns.map((column) => column.id));
  }, [onChangeVisibleColumns, columns]);

  return {
    columns,
    isBrowserFieldDataLoading,
    browserFields,
    visibleColumns,
    onColumnsChange,
    onToggleColumn,
    onResetColumns,
    onChangeVisibleColumns,
  };
};
