/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn, EuiDataGridOnColumnResizeData } from '@elastic/eui';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';
import { AlertsTableStorage } from '../../alerts_table_state';
import { toggleColumn } from './toggle_column';
import { useFetchBrowserFieldCapabilities } from '../use_fetch_browser_fields_capabilities';

export interface UseColumnsArgsTemp {
  storageAlertsTable: React.MutableRefObject<AlertsTableStorage>;
  storage: React.MutableRefObject<IStorageWrapper>;
  id: string;
  defaultColumns: EuiDataGridColumn[];
  initialBrowserFields?: BrowserFields;
}
export type UseColumnsArgs = UseColumnsArgsTemp &
  (
    | {
        // @deprecated should use ruleTypeIds
        featureIds: AlertConsumers[];
        ruleTypeIds?: never;
      }
    | {
        featureIds?: never;
        ruleTypeIds: string[];
      }
  );

export interface UseColumnsResp {
  columns: EuiDataGridColumn[];
  visibleColumns: string[];
  isBrowserFieldDataLoading: boolean | undefined;
  browserFields: BrowserFields;
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onChangeVisibleColumns: (columnIds: string[]) => void;
  onColumnResize: (args: EuiDataGridOnColumnResizeData) => void;
  fields: Array<{
    field: string;
    include_unmapped: boolean;
  }>;
}

const fieldTypeToDataGridColumnTypeMapper = (fieldType: string | undefined) => {
  if (fieldType === 'date') return 'datetime';
  if (fieldType === 'number') return 'numeric';
  if (fieldType === 'object') return 'json';
  return fieldType;
};

const getFieldCategoryFromColumnId = (columnId: string): string => {
  const fieldName = columnId.split('.');

  if (fieldName.length === 1) {
    return 'base';
  }

  return fieldName[0];
};

/**
 * EUI Data Grid expects the columns to have a property 'schema' defined for proper sorting
 * this schema as its own types as can be check out in the docs so we add it here manually
 * https://eui.elastic.co/#/tabular-content/data-grid-schema-columns
 */
const euiColumnFactory = (
  columnId: string,
  browserFields: BrowserFields,
  defaultColumns: EuiDataGridColumn[]
): EuiDataGridColumn => {
  const defaultColumn = getColumnByColumnId(defaultColumns, columnId);
  const column = defaultColumn ? defaultColumn : { id: columnId };

  const browserFieldsProps = getBrowserFieldProps(columnId, browserFields);
  return {
    ...column,
    schema: fieldTypeToDataGridColumnTypeMapper(browserFieldsProps.type),
  };
};

const getBrowserFieldProps = (
  columnId: string,
  browserFields: BrowserFields
): Partial<BrowserField> => {
  const notFoundSpecs = { type: 'string' };

  if (!browserFields || Object.keys(browserFields).length === 0) {
    return notFoundSpecs;
  }

  const category = getFieldCategoryFromColumnId(columnId);
  if (!browserFields[category]) {
    return notFoundSpecs;
  }

  const categorySpecs = browserFields[category].fields;
  if (!categorySpecs) {
    return notFoundSpecs;
  }

  const fieldSpecs = categorySpecs[columnId];
  return fieldSpecs ? fieldSpecs : notFoundSpecs;
};

const isPopulatedColumn = (column: EuiDataGridColumn) => Boolean(column.schema);

/**
 * @param columns Columns to be considered in the alerts table
 * @param browserFields constant object with all field capabilities
 * @returns columns but with the info needed by the data grid to work as expected, e.g sorting
 */
const populateColumns = (
  columns: EuiDataGridColumn[],
  browserFields: BrowserFields,
  defaultColumns: EuiDataGridColumn[]
): EuiDataGridColumn[] => {
  return columns.map((column: EuiDataGridColumn) => {
    return isPopulatedColumn(column)
      ? column
      : euiColumnFactory(column.id, browserFields, defaultColumns);
  });
};

const getColumnIds = (columns: EuiDataGridColumn[]): string[] => {
  return columns.map((column: EuiDataGridColumn) => column.id);
};

const getColumnByColumnId = (columns: EuiDataGridColumn[], columnId: string) => {
  return columns.find(({ id }: { id: string }) => id === columnId);
};

const persist = ({
  id,
  storageAlertsTable,
  columns,
  storage,
  visibleColumns,
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
  ruleTypeIds,
  storageAlertsTable,
  storage,
  id,
  defaultColumns,
  initialBrowserFields,
}: UseColumnsArgs): UseColumnsResp => {
  const [isBrowserFieldDataLoading, browserFields] = useFetchBrowserFieldCapabilities(
    featureIds
      ? {
          featureIds,
          initialBrowserFields,
        }
      : { ruleTypeIds, initialBrowserFields }
  );

  const [columns, setColumns] = useState<EuiDataGridColumn[]>(() => {
    let cols = storageAlertsTable.current.columns;
    // before restoring from storage, enrich the column data
    if (initialBrowserFields && defaultColumns) {
      cols = populateColumns(cols, initialBrowserFields, defaultColumns);
    } else if (cols && cols.length === 0) {
      cols = defaultColumns;
    }
    return cols;
  });

  const [visibleColumns, setVisibleColumns] = useState(
    storageAlertsTable.current.visibleColumns ?? getColumnIds(columns)
  );

  const [isColumnsPopulated, setColumnsPopulated] = useState<boolean>(false);

  const defaultColumnsRef = useRef<typeof defaultColumns>(defaultColumns);

  const didDefaultColumnChange = defaultColumns !== defaultColumnsRef.current;

  const setColumnsByColumnIds = useCallback(
    (columnIds: string[]) => {
      setVisibleColumns(columnIds);
      persist({
        id,
        storage,
        storageAlertsTable,
        columns,
        visibleColumns: columnIds,
      });
    },
    [columns, id, storage, storageAlertsTable]
  );

  useEffect(() => {
    // if defaultColumns have changed,
    // get the latest columns provided by client and
    if (didDefaultColumnChange && defaultColumnsRef.current) {
      defaultColumnsRef.current = defaultColumns;
      setColumnsPopulated(false);
      // storageAlertTable already account for the changes in defaultColumns
      // Technically storageAlertsTable = localStorageData ?? defaultColumns
      setColumns(storageAlertsTable.current.columns);
      setVisibleColumns(storageAlertsTable.current.visibleColumns ?? visibleColumns);
      return;
    }
  }, [didDefaultColumnChange, storageAlertsTable, defaultColumns, visibleColumns]);

  useEffect(() => {
    if (isEmpty(browserFields) || isColumnsPopulated) return;

    const populatedColumns = populateColumns(columns, browserFields, defaultColumns);

    setColumnsPopulated(true);
    setColumns(populatedColumns);
  }, [browserFields, defaultColumns, isBrowserFieldDataLoading, isColumnsPopulated, columns]);

  const setColumnsAndSave = useCallback(
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

  const onToggleColumn = useCallback(
    (columnId: string): void => {
      const column = euiColumnFactory(columnId, browserFields, defaultColumns);

      const newColumns = toggleColumn({
        column,
        columns,
        defaultColumns,
      });
      let newVisibleColumns = visibleColumns;
      if (visibleColumns.includes(columnId)) {
        newVisibleColumns = visibleColumns.filter((vc) => vc !== columnId);
      } else {
        newVisibleColumns = [visibleColumns[0], columnId, ...visibleColumns.slice(1)];
      }
      setVisibleColumns(newVisibleColumns);
      setColumnsAndSave(newColumns, newVisibleColumns);
    },
    [browserFields, columns, defaultColumns, setColumnsAndSave, visibleColumns]
  );

  const onResetColumns = useCallback(() => {
    const populatedDefaultColumns = populateColumns(defaultColumns, browserFields, defaultColumns);
    const newVisibleColumns = populatedDefaultColumns.map((pdc) => pdc.id);
    setVisibleColumns(newVisibleColumns);
    setColumnsAndSave(populatedDefaultColumns, newVisibleColumns);
  }, [browserFields, defaultColumns, setColumnsAndSave]);

  const onColumnResize = useCallback(
    ({ columnId, width }: EuiDataGridOnColumnResizeData) => {
      const colIndex = columns.findIndex((c) => c.id === columnId);
      if (colIndex > -1) {
        columns.splice(colIndex, 1, { ...columns[colIndex], initialWidth: width });
        setColumnsAndSave(columns, visibleColumns);
      }
    },
    [columns, setColumnsAndSave, visibleColumns]
  );

  const fieldsToFetch = useMemo(
    () => [...columns.map((col) => ({ field: col.id, include_unmapped: true }))],
    [columns]
  );

  return useMemo(
    () => ({
      columns,
      visibleColumns,
      isBrowserFieldDataLoading,
      browserFields,
      onToggleColumn,
      onResetColumns,
      onChangeVisibleColumns: setColumnsByColumnIds,
      onColumnResize,
      fields: fieldsToFetch,
    }),
    [
      browserFields,
      columns,
      fieldsToFetch,
      isBrowserFieldDataLoading,
      onColumnResize,
      onResetColumns,
      onToggleColumn,
      setColumnsByColumnIds,
      visibleColumns,
    ]
  );
};
