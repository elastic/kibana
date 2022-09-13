/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import negate from 'lodash/negate';
import { RawIndicatorFieldId } from '../../../../../../common/types/indicator';
import { useKibana } from '../../../../../hooks/use_kibana';
import { translateFieldLabel } from '../../indicator_field_label';

const DEFAULT_COLUMNS: EuiDataGridColumn[] = [
  RawIndicatorFieldId.TimeStamp,
  RawIndicatorFieldId.Name,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.FirstSeen,
  RawIndicatorFieldId.LastSeen,
].map((field) => ({
  id: field,
  displayAsText: translateFieldLabel(field),
}));

const DEFAULT_VISIBLE_COLUMNS = DEFAULT_COLUMNS.map((column) => column.id);

const INDICATORS_TABLE_STORAGE = 'indicatorsTable' as const;

export const useColumnSettings = () => {
  const {
    services: { storage },
  } = useKibana();

  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Array<EuiDataGridColumn['id']>>([]);

  /** Deserialize preferences on mount */
  useEffect(() => {
    const cachedPreferences = storage.get(INDICATORS_TABLE_STORAGE) || {
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      columns: DEFAULT_COLUMNS,
    };

    const { visibleColumns: cachedVisibleColumns, columns: cachedColumns } = cachedPreferences;

    setVisibleColumns(cachedVisibleColumns);
    setColumns(cachedColumns);
  }, [storage]);

  /** Ensure preferences are serialized into plugin storage on change */
  useEffect(() => {
    storage.set(INDICATORS_TABLE_STORAGE, { visibleColumns, columns });
  }, [columns, storage, visibleColumns]);

  /** Toggle column and adjust its visibility */
  const handleToggleColumn = useCallback((columnId: string) => {
    setColumns((currentColumns) => {
      const columnsMatchingId = ({ id }: EuiDataGridColumn) => id === columnId;
      const columnsNotMatchingId = negate(columnsMatchingId);

      const enabled = Boolean(currentColumns.find(columnsMatchingId));

      if (enabled) {
        return currentColumns.filter(columnsNotMatchingId);
      }

      return [...currentColumns, { id: columnId as any, displayAsText: columnId }];
    });

    setVisibleColumns((currentlyVisibleColumns) => {
      const matchById = (id: string) => id === columnId;
      const notMatchingId = negate(matchById);

      const enabled = Boolean(currentlyVisibleColumns.find(matchById));

      if (enabled) {
        return currentlyVisibleColumns.filter(notMatchingId);
      }

      return [...currentlyVisibleColumns, columnId];
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS);
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  const columnVisibility = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns: setVisibleColumns as (cols: string[]) => void,
    }),
    [visibleColumns]
  );

  return {
    handleResetColumns,
    handleToggleColumn,
    columns,
    columnVisibility,
  };
};
