/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  AlertsTableConfigurationRegistryContract,
  GetRenderCellValue,
} from '@kbn/triggers-actions-ui-plugin/public';

import type {
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridRefProps,
} from '@elastic/eui';
import { get } from 'lodash';
import { APP_ID, CASES_FEATURE_ID } from '../../../../common/constants';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { TableId } from '../../../../common/types';
import { getColumns } from '../../../detections/configurations/security_solution_detections';
import { useRenderCellValue } from '../../../detections/configurations/security_solution_detections/render_cell_value';
import { useToGetInternalFlyout } from '../../../timelines/components/side_panel/event_details/flyout';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import type { Ecs } from '../../../../common/ecs';
import { useSourcererDataView } from '../../containers/sourcerer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { defaultCellActions } from '../cell_actions/default_cell_actions';

const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract,
  storage: Storage
) => {
  if (registry.has(APP_ID)) {
    return;
  }
  const dataTableStorage = getDataTablesInStorageByIds(storage, [TableId.alertsOnAlertsPage]);
  const columnsFormStorage = dataTableStorage?.[TableId.alertsOnAlertsPage]?.columns ?? [];
  const alertColumns = columnsFormStorage.length ? columnsFormStorage : getColumns();

  registry.register({
    id: APP_ID,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: useRenderCellValue as GetRenderCellValue,
    useInternalFlyout: () => {
      const { header, body, footer } = useToGetInternalFlyout();
      return { header, body, footer };
    },
    useCellActions: ({
      columns,
      data,
      ecsData,
      dataGridRef,
      pageSize,
    }: {
      columns: EuiDataGridColumn[];
      data: unknown[][];
      ecsData: unknown[];
      dataGridRef?: EuiDataGridRefProps;
      pageSize: number;
    }) => {
      const { browserFields } = useSourcererDataView(SourcererScopeName.detections);
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
            }) as ColumnHeaderOptions[],
            scopeId: TimelineId.casePage,
            pageSize,
            closeCellPopover: dataGridRef?.closeCellPopover,
          });
        }) as EuiDataGridColumnCellAction[],
        visibleCellActions: 3,
        disabledCellActions: [],
      };
    },
  });
};

export { registerAlertsTableConfiguration };
