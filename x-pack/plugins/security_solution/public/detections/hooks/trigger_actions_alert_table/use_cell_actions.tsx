/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserField, TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useCallback, useMemo } from 'react';
import { tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { TableId } from '@kbn/securitysolution-data-table';
import { getAllFieldsByName } from '../../../common/containers/source';
import type { UseDataGridColumnsSecurityCellActionsProps } from '../../../common/components/cell_actions';
import { useDataGridColumnsSecurityCellActions } from '../../../common/components/cell_actions';
import { SecurityCellActionsTrigger } from '../../../actions/constants';
import { VIEW_SELECTION } from '../../../../common/constants';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';

export const getUseCellActionsHook = (tableId: TableId) => {
  const useCellActions: AlertsTableConfigurationRegistry['useCellActions'] = ({
    columns,
    data,
    dataGridRef,
  }) => {
    const { browserFields } = useSourcererDataView(SourcererScopeName.detections);
    /**
     * There is difference between how `triggers actions` fetched data v/s
     * how security solution fetches data via timelineSearchStrategy
     *
     * _id and _index fields are array in timelineSearchStrategy  but not in
     * ruleStrategy
     *
     *
     */

    const browserFieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
    const finalData = useMemo(
      () =>
        (data as TimelineNonEcsData[][]).map((row) =>
          row.map((field) => {
            let localField = field;
            if (['_id', '_index'].includes(field.field)) {
              const newValue = field.value ?? '';
              localField = {
                field: field.field,
                value: Array.isArray(newValue) ? newValue : [newValue],
              };
            }
            return localField;
          })
        ),
      [data]
    );

    const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

    const viewMode =
      useShallowEqualSelector((state) => (getTable(state, tableId) ?? tableDefaults).viewMode) ??
      tableDefaults.viewMode;

    const cellActionsMetadata = useMemo(() => ({ scopeId: tableId }), []);

    const cellActionsFields = useMemo<UseDataGridColumnsSecurityCellActionsProps['fields']>(() => {
      if (viewMode === VIEW_SELECTION.eventRenderedView) {
        return undefined;
      }
      return columns.map((column) => {
        const browserField: Partial<BrowserField> | undefined = browserFieldsByName[column.id];
        return {
          name: column.id,
          type: browserField?.type ?? 'keyword',
          aggregatable: browserField?.aggregatable,
        };
      });
    }, [browserFieldsByName, columns, viewMode]);

    const getCellValue = useCallback<UseDataGridColumnsSecurityCellActionsProps['getCellValue']>(
      (fieldName, rowIndex) => {
        const pageRowIndex = rowIndex % finalData.length;
        return finalData[pageRowIndex].find((rowData) => rowData.field === fieldName)?.value ?? [];
      },
      [finalData]
    );

    const cellActions = useDataGridColumnsSecurityCellActions({
      triggerId: SecurityCellActionsTrigger.DEFAULT,
      fields: cellActionsFields,
      getCellValue,
      metadata: cellActionsMetadata,
      dataGridRef,
    });

    const getCellActions = useCallback(
      (_columnId: string, columnIndex: number) => {
        if (cellActions.length === 0) return [];
        return cellActions[columnIndex];
      },
      [cellActions]
    );

    return {
      getCellActions,
      visibleCellActions: 3,
    };
  };

  return useCellActions;
};
