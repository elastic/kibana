/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';

import { getPersistentControlsHook } from '../../../detections/hooks/trigger_actions_alert_table/use_persistent_controls';
import { useActionsColumn } from '../../../detections/hooks/trigger_actions_alert_table/use_actions_column';
import { APP_ID, CASES_FEATURE_ID } from '../../../../common/constants';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import { TableId, TimelineId } from '../../../../common/types';
import { getColumns } from '../../../detections/configurations/security_solution_detections';
import { getRenderCellValueHook } from '../../../detections/configurations/security_solution_detections/render_cell_value';
import { useToGetInternalFlyout } from '../../../timelines/components/side_panel/event_details/flyout';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useBulkActionHook } from '../../../detections/hooks/trigger_actions_alert_table/use_bulk_actions';
import { useCellActions } from '../../../detections/hooks/trigger_actions_alert_table/use_cell_actions';

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

  const useInternalFlyout = () => {
    const { header, body, footer } = useToGetInternalFlyout();
    return { header, body, footer };
  };

  const usePersistentControls = getPersistentControlsHook(storage);

  const renderCellValueHookAlertPage = getRenderCellValueHook({
    scopeId: SourcererScopeName.default,
  });

  const renderCellValueHookCasePage = getRenderCellValueHook({
    scopeId: TimelineId.casePage,
  });

  // regitser Alert Table on Alert Page
  registry.register({
    id: `${APP_ID}`,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: renderCellValueHookAlertPage,
    useActionsColumn,
    useInternalFlyout,
    useBulkActions: useBulkActionHook,
    useCellActions,
    usePersistentControls,
  });

  registry.register({
    id: `${APP_ID}-case`,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: renderCellValueHookCasePage,
    useActionsColumn,
    useInternalFlyout,
    useBulkActions: useBulkActionHook,
    useCellActions,
    usePersistentControls,
  });
};

export { registerAlertsTableConfiguration };
