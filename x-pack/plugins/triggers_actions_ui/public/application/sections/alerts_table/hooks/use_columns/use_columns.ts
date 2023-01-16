/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { isEqual } from 'lodash';
import { AlertsTableStorage } from '../../alerts_table_state';
import { toggleColumn } from './toggle_column';
import { useFetchBrowserFieldCapabilities } from '../use_fetch_browser_fields_capabilities';

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

  const defaultColumnsRef = useRef<typeof defaultColumns>();
  const [areColumnsChange, setColumnsChange] = useState(false);

  useEffect(() => {
    const defaultColumnsEqual = isEqual(defaultColumns, defaultColumnsRef.current);

    if (!defaultColumnsEqual && isColumnsPopulated) {
      setColumnsPopulated(false);
      return;
    }

    const isApiNeverCalled = isBrowserFieldDataLoading !== false; // loading, undefined

    const noOp = isApiNeverCalled && isColumnsPopulated;

    if (noOp) return;

    defaultColumnsRef.current = defaultColumns;
    const columnsToPopulate = defaultColumnsEqual ? columns : defaultColumns;

    const populatedColumns = populateColumns(columnsToPopulate, browserFields, defaultColumns);
    setColumnsPopulated(true);
    setColumnsChange(false);
    setColumns(populatedColumns);
  }, [
    browserFields,
    columns,
    defaultColumns,
    isBrowserFieldDataLoading,
    isColumnsPopulated,
    areColumnsChange,
  ]);

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
      const column = euiColumnFactory(columnId, browserFields, defaultColumns);

      const newColumns = toggleColumn({
        column,
        columns,
        defaultColumns,
      });

      setColumnsAndSave(newColumns);
    },
    [browserFields, columns, defaultColumns, setColumnsAndSave]
  );

  const onResetColumns = useCallback(() => {
    const populatedDefaultColumns = populateColumns(defaultColumns, browserFields, defaultColumns);
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
