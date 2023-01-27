/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';

import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { getUseCellActionsHook } from '../../../detections/hooks/trigger_actions_alert_table/use_cell_actions';
import { getBulkActionHook } from '../../../detections/hooks/trigger_actions_alert_table/use_bulk_actions';
import { getUseActionColumnHook } from '../../../detections/hooks/trigger_actions_alert_table/use_actions_column';
import { getPersistentControlsHook } from '../../../detections/hooks/trigger_actions_alert_table/use_persistent_controls';
import { APP_ID, CASES_FEATURE_ID } from '../../../../common/constants';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import { TableId, TimelineId } from '../../../../common/types';
import { getColumns } from '../../../detections/configurations/security_solution_detections';
import { getRenderCellValueHook } from '../../../detections/configurations/security_solution_detections/render_cell_value';
import { useToGetInternalFlyout } from '../../../timelines/components/side_panel/event_details/flyout';
import { SourcererScopeName } from '../../store/sourcerer/model';

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

  const renderCellValueHookAlertPage = getRenderCellValueHook({
    scopeId: SourcererScopeName.default,
  });

  const renderCellValueHookCasePage = getRenderCellValueHook({
    scopeId: TimelineId.casePage,
  });

  const sort: AlertsTableConfigurationRegistry['sort'] = [
    {
      '@timestamp': {
        order: 'desc',
      },
    },
  ];

  // register Alert Table on Alert Page
  registry.register({
    id: `${APP_ID}`,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: renderCellValueHookAlertPage,
    useActionsColumn: getUseActionColumnHook(TableId.alertsOnAlertsPage),
    useInternalFlyout,
    useBulkActions: getBulkActionHook(TableId.alertsOnAlertsPage),
    useCellActions: getUseCellActionsHook(TableId.alertsOnAlertsPage),
    usePersistentControls: getPersistentControlsHook(TableId.alertsOnAlertsPage),
    sort,
  });

  // register Alert Table on RuleDetails Page
  registry.register({
    id: `${APP_ID}-rule-details`,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: renderCellValueHookAlertPage,
    useActionsColumn: getUseActionColumnHook(TableId.alertsOnRuleDetailsPage),
    useInternalFlyout,
    useBulkActions: getBulkActionHook(TableId.alertsOnRuleDetailsPage),
    useCellActions: getUseCellActionsHook(TableId.alertsOnRuleDetailsPage),
    usePersistentControls: getPersistentControlsHook(TableId.alertsOnRuleDetailsPage),
    sort,
  });

  registry.register({
    id: `${APP_ID}-case`,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: renderCellValueHookCasePage,
    useInternalFlyout,
    useBulkActions: getBulkActionHook(TableId.alertsOnCasePage),
    useCellActions: getUseCellActionsHook(TableId.alertsOnCasePage),
    sort,
  });
};

export { registerAlertsTableConfiguration };
