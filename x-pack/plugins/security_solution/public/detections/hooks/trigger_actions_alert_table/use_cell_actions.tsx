/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { get } from 'lodash';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useCallback, useMemo } from 'react';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { VIEW_SELECTION } from '../../../../common/constants';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { defaultCellActions } from '../../../common/lib/cell_actions/default_cell_actions';
import type { TableId } from '../../../../common/types';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../../common/lib/cell_actions/constants';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { dataTableSelectors } from '../../../common/store/data_table';

export const getUseCellActionsHook = (tableId: TableId) => {
  const useCellActions: AlertsTableConfigurationRegistry['useCellActions'] = ({
    columns,
    data,
    ecsData,
    dataGridRef,
    pageSize,
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

    const getCellActions = useCallback(
      (columnId: string) => {
        if (viewMode === VIEW_SELECTION.eventRenderedView) {
          // No cell actions are needed when eventRenderedView
          return [];
        }

        return defaultCellActions.map((dca) => {
          return dca({
            browserFields,
            data: finalData,
            ecsData: ecsData as Ecs[],
            header: columns
              .filter((col) => col.id === columnId)
              .map((col) => {
                const splitCol = col.id.split('.');
                const fields =
                  splitCol.length > 0
                    ? get(browserFields, [
                        splitCol.length === 1 ? 'base' : splitCol[0],
                        'fields',
                        col.id,
                      ])
                    : {};
                return {
                  ...col,
                  ...fields,
                };
              })[0],
            scopeId: SourcererScopeName.default,
            pageSize,
            closeCellPopover: dataGridRef?.current?.closeCellPopover,
          });
        });
      },
      [browserFields, columns, finalData, dataGridRef, ecsData, pageSize, viewMode]
    );

    return {
      getCellActions,
      visibleCellActions: 3,
      disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
    };
  };

  return useCellActions;
};
