/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useCallback, useMemo } from 'react';
import { TableId, tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { UseDataGridColumnsSecurityCellActionsProps } from '../../../common/components/cell_actions';
import { useDataGridColumnsSecurityCellActions } from '../../../common/components/cell_actions';
import { SecurityCellActionsTrigger, SecurityCellActionType } from '../../../actions/constants';
import { VIEW_SELECTION } from '../../../../common/constants';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useGetFieldSpec } from '../../../common/hooks/use_get_field_spec';
import { useDataViewId } from '../../../common/hooks/use_data_view_id';

export const getUseCellActionsHook = (tableId: TableId) => {
  const useCellActions: AlertsTableConfigurationRegistry['useCellActions'] = ({
    columns,
    data,
    dataGridRef,
    pageSize,
    pageIndex,
  }) => {
    const getFieldSpec = useGetFieldSpec(SourcererScopeName.detections);
    const dataViewId = useDataViewId(SourcererScopeName.detections);
    /**
     * There is difference between how `triggers actions` fetched data v/s
     * how security solution fetches data via timelineSearchStrategy
     *
     * _id and _index fields are array in timelineSearchStrategy  but not in
     * ruleStrategy
     *
     *
     */

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

    const cellActionsMetadata = useMemo(() => ({ scopeId: tableId, dataViewId }), [dataViewId]);

    const cellActionsFields = useMemo<UseDataGridColumnsSecurityCellActionsProps['fields']>(() => {
      if (viewMode === VIEW_SELECTION.eventRenderedView) {
        return undefined;
      }
      return columns.map(
        (column) =>
          getFieldSpec(column.id) ?? {
            name: '',
            type: '', // When type is an empty string all cell actions are incompatible
            aggregatable: false,
            searchable: false,
          }
      );
    }, [getFieldSpec, columns, viewMode]);

    const getCellValue = useCallback<UseDataGridColumnsSecurityCellActionsProps['getCellValue']>(
      (fieldName, rowIndex) => {
        const pageRowIndex = rowIndex - pageSize * pageIndex;
        return finalData[pageRowIndex]?.find((rowData) => rowData.field === fieldName)?.value ?? [];
      },
      [finalData, pageIndex, pageSize]
    );

    const disabledActionTypes =
      tableId === TableId.alertsOnCasePage ? [SecurityCellActionType.FILTER] : undefined;

    const cellActions = useDataGridColumnsSecurityCellActions({
      triggerId: SecurityCellActionsTrigger.DEFAULT,
      fields: cellActionsFields,
      getCellValue,
      metadata: cellActionsMetadata,
      dataGridRef,
      disabledActionTypes,
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
