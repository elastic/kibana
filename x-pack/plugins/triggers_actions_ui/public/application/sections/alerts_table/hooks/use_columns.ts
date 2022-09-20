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
import { AlertsTableStorage } from '../alerts_table_state';
import { useFetchBrowserFieldCapabilities } from './use_fetch_browser_fields_capabilities';

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

const getColumnByColumnId = (columns: EuiDataGridColumn[], columnId: string) => {
  return columns.find(({ id }: { id: string }) => id === columnId);
};

const persist = ({
  id,
  storageAlertsTable,
  columns,
  visibleColumns,
  storage,
}: {
  id: string;
  storageAlertsTable: React.MutableRefObject<AlertsTableStorage>;
  storage: React.MutableRefObject<IStorageWrapper>;
  columns: EuiDataGridColumn[];
  visibleColumns: string[];
}) => {
  storageAlertsTable.current = {
    ...storageAlertsTable.current,
    columns,
    visibleColumns,
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
  const [visibleColumns, setVisibleColumns] = useState(
    storageAlertsTable.current.visibleColumns ?? []
  );

  useEffect(() => {
    if (isBrowserFieldDataLoading !== false || isColumnsPopulated) return;

    const populatedColumns = populateColumns(columns, browserFields);
    setColumnsPopulated(true);
    setColumns(populatedColumns);
  }, [browserFields, columns, isBrowserFieldDataLoading, isColumnsPopulated]);

  const onColumnsChange = useCallback(
    (newColumns: EuiDataGridColumn[], newVisibleColumns: string[]) => {
      setColumns(newColumns);
      persist({
        id,
        storage,
        storageAlertsTable,
        columns: newColumns,
        visibleColumns: newVisibleColumns,
      });
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
      const visibleIndex = visibleColumns.indexOf(columnId);
      const defaultIndex = defaultColumns.findIndex(
        (column: EuiDataGridColumn) => column.id === columnId
      );

      const isVisible = visibleIndex >= 0;
      const isInDefaultConfig = defaultIndex >= 0;

      let newColumnIds: string[] = [];

      // if the column is shown, remove it
      if (isVisible) {
        newColumnIds = [
          ...visibleColumns.slice(0, visibleIndex),
          ...visibleColumns.slice(visibleIndex + 1),
        ];
      }

      // if the column isn't shown but it's part of the default config
      // insert into the same position as in the default config
      if (!isVisible && isInDefaultConfig) {
        newColumnIds = [
          ...visibleColumns.slice(0, defaultIndex),
          columnId,
          ...visibleColumns.slice(defaultIndex),
        ];
      }

      // if the column isn't shown and it's not part of the default config
      // push it into the second position. Behaviour copied by t_grid, security
      // does this to insert right after the timestamp column
      if (!isVisible && !isInDefaultConfig) {
        newColumnIds = [visibleColumns[0], columnId, ...visibleColumns.slice(1)];
      }

      const newColumns = newColumnIds.map((_columnId) => {
        const column = getColumnByColumnId(defaultColumns, _columnId);
        return euiColumnFactory(column ? column : { id: _columnId }, browserFields);
      });

      setVisibleColumns(newColumnIds);
      setColumns(newColumns);
      persist({
        id,
        storage,
        storageAlertsTable,
        columns: newColumns,
        visibleColumns: newColumnIds,
      });
    },
    [browserFields, defaultColumns, id, storage, storageAlertsTable, visibleColumns]
  );

  const onResetColumns = useCallback(() => {
    const newVisibleColumns = defaultColumns.map((column) => column.id);
    const populatedDefaultColumns = populateColumns(defaultColumns, browserFields);
    setVisibleColumns(newVisibleColumns);
    setColumns(populatedDefaultColumns);
    persist({
      id,
      storage,
      storageAlertsTable,
      columns: populatedDefaultColumns,
      visibleColumns: newVisibleColumns,
    });
  }, [browserFields, defaultColumns, id, storage, storageAlertsTable]);

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
