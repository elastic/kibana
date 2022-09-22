/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import { useCallback, useEffect, useState } from 'react';
import { AlertsTableStorage } from '../../alerts_table_state';
import { useFetchBrowserFieldCapabilities } from '../use_fetch_browser_fields_capabilities';
import { toggleColumn } from './toggle_column';

interface UseColumnsArgs {
  featureIds: AlertConsumers[];
  storageAlertsTable: React.MutableRefObject<AlertsTableStorage>;
  storage: React.MutableRefObject<IStorageWrapper>;
  id: string;
  defaultColumns: EuiDataGridColumn[];
}

const fieldTypeToDataGridColumnTypeMapper = (fieldType: string | undefined) => {
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
 * Searches in browser fields object for a specific field
 */
const getBrowserFieldProps = (
  columnId: string,
  browserFields: BrowserFields
): Partial<BrowserField> => {
  for (const [, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      continue;
    }

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      if (fieldName === columnId) {
        return fieldDescriptor;
      }
    }
  }
  return { type: 'string' };
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

const getColumnIds = (columns: EuiDataGridColumn[]): string[] => {
  return columns.map((column: EuiDataGridColumn) => column.id);
};

const getColumnByColumnId = (columns: EuiDataGridColumn[], columnId: string) => {
  return columns.find(({ id }: { id: string }) => id === columnId);
};

const getColumnsByColumnIds = (columns: EuiDataGridColumn[], columnIds: string[]) => {
  return columnIds
    .map((columnId: string) => columns.find((column: EuiDataGridColumn) => column.id === columnId))
    .filter(Boolean) as EuiDataGridColumn[];
};

const persist = ({
  id,
  storageAlertsTable,
  columns,
  storage,
}: {
  id: string;
  storageAlertsTable: React.MutableRefObject<AlertsTableStorage>;
  storage: React.MutableRefObject<IStorageWrapper>;
  columns: EuiDataGridColumn[];
}) => {
  storageAlertsTable.current = {
    ...storageAlertsTable.current,
    columns,
  };
  storage.current.set(id, storageAlertsTable.current);
};

export const useColumns = ({
  featureIds,
  storageAlertsTable,
  storage,
  id,
  defaultColumns,
}: UseColumnsArgs) => {
  const [isBrowserFieldDataLoading, browserFields] = useFetchBrowserFieldCapabilities({
    featureIds,
  });
  const [columns, setColumns] = useState<EuiDataGridColumn[]>(storageAlertsTable.current.columns);
  const [isColumnsPopulated, setColumnsPopulated] = useState<boolean>(false);

  useEffect(() => {
    if (isBrowserFieldDataLoading !== false || isColumnsPopulated) return;

    const populatedColumns = populateColumns(columns, browserFields);
    setColumnsPopulated(true);
    setColumns(populatedColumns);
  }, [browserFields, columns, isBrowserFieldDataLoading, isColumnsPopulated]);

  const setColumnsAndSave = useCallback(
    (newColumns: EuiDataGridColumn[]) => {
      setColumns(newColumns);
      persist({
        id,
        storage,
        storageAlertsTable,
        columns: newColumns,
      });
    },
    [id, storage, storageAlertsTable]
  );

  const setColumnsByColumnIds = useCallback(
    (columnIds: string[]) => {
      const newColumns = getColumnsByColumnIds(columns, columnIds);
      setColumnsAndSave(newColumns);
    },
    [setColumnsAndSave, columns]
  );

  const onToggleColumn = useCallback(
    (columnId: string): void => {
      const newColumnIds = toggleColumn({
        columnId,
        columnIds: getColumnIds(columns),
        defaultColumns,
      });

      const newColumns = newColumnIds.map((_columnId: string) => {
        const column = getColumnByColumnId(defaultColumns, _columnId);
        return euiColumnFactory(column ? column : { id: _columnId }, browserFields);
      });

      setColumnsAndSave(newColumns);
    },
    [browserFields, columns, defaultColumns, setColumnsAndSave]
  );

  const onResetColumns = useCallback(() => {
    const populatedDefaultColumns = populateColumns(defaultColumns, browserFields);
    setColumnsAndSave(populatedDefaultColumns);
  }, [browserFields, defaultColumns, setColumnsAndSave]);

  return {
    columns,
    visibleColumns: getColumnIds(columns),
    isBrowserFieldDataLoading,
    browserFields,
    onColumnsChange: setColumnsAndSave,
    onToggleColumn,
    onResetColumns,
    onChangeVisibleColumns: setColumnsByColumnIds,
  };
};
