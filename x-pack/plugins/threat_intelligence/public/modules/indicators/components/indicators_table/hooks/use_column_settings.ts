/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import negate from 'lodash/negate';
import { RawIndicatorFieldId } from '../../../../../../common/types/indicator';
import { useKibana } from '../../../../../hooks/use_kibana';

const DEFAULT_COLUMNS: EuiDataGridColumn[] = [
  {
    id: RawIndicatorFieldId.TimeStamp,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.timestampColumnTitle', {
      defaultMessage: '@timestamp',
    }),
  },
  {
    id: RawIndicatorFieldId.Name,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.indicatorColumTitle', {
      defaultMessage: 'Indicator',
    }),
  },
  {
    id: RawIndicatorFieldId.Type,
    displayAsText: i18n.translate(
      'xpack.threatIntelligence.indicator.table.indicatorTypeColumTitle',
      {
        defaultMessage: 'Indicator type',
      }
    ),
  },
  {
    id: RawIndicatorFieldId.Feed,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.FeedColumTitle', {
      defaultMessage: 'Feed',
    }),
  },
  {
    id: RawIndicatorFieldId.FirstSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.firstSeenColumTitle', {
      defaultMessage: 'First seen',
    }),
  },
  {
    id: RawIndicatorFieldId.LastSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.lastSeenColumTitle', {
      defaultMessage: 'Last seen',
    }),
  },
];

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
