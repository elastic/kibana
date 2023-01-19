/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridRefProps,
} from '@elastic/eui';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { get } from 'lodash';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { defaultCellActions } from '../../../common/lib/cell_actions/default_cell_actions';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../../common/lib/cell_actions/constants';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import type { Ecs } from '../../../../common/ecs';
import { VIEW_SELECTION } from '../../../common/components/events_viewer/summary_view_select';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { alertTableViewModeSelector } from '../../../common/store/alert_table/selectors';

export const useCellActions = ({
  columns,
  data,
  ecsData,
  dataGridRef,
  pageSize,
}: {
  // Hover Actions
  columns: EuiDataGridColumn[];
  data: unknown[][];
  ecsData: unknown[];
  dataGridRef?: EuiDataGridRefProps;
  pageSize: number;
}) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.detections);
  const viewModeSelector = alertTableViewModeSelector();
  const viewMode = useShallowEqualSelector((state) => viewModeSelector(state));

  if (viewMode === VIEW_SELECTION.eventRenderedView) {
    return { cellActions: [] };
  }

  return {
    cellActions: defaultCellActions.map((dca) => {
      return dca({
        browserFields,
        data: data as TimelineNonEcsData[][],
        ecsData: ecsData as Ecs[],
        header: columns.map((col) => {
          const splitCol = col.id.split('.');
          const fields =
            splitCol.length > 0
              ? get(browserFields, [splitCol.length === 1 ? 'base' : splitCol[0], 'fields', col.id])
              : {};
          return {
            ...col,
            ...fields,
          };
        }) as ColumnHeaderOptions[],
        scopeId: SourcererScopeName.default,
        pageSize,
        closeCellPopover: dataGridRef?.closeCellPopover,
      });
    }) as EuiDataGridColumnCellAction[],
    visibleCellActions: 5,
    disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
  };
};
