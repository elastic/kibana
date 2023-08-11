/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/config';
import { Observable } from 'rxjs';
import { GetAlertIndicesAlias, ILicenseState } from '../lib';
import { defineLegacyRoutes } from './legacy';
import { AlertingRequestHandlerContext } from '../types';
import { createRuleRoute } from './rule/apis/create';
import { getRuleRoute, getInternalRuleRoute } from './get_rule';
import { updateRuleRoute } from './update_rule';
import { deleteRuleRoute } from './delete_rule';
import { aggregateRulesRoute } from './aggregate_rules';
import { disableRuleRoute } from './disable_rule';
import { enableRuleRoute } from './enable_rule';
import { findRulesRoute, findInternalRulesRoute } from './find_rules';
import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { getRuleExecutionLogRoute } from './get_rule_execution_log';
import { getGlobalExecutionLogRoute } from './get_global_execution_logs';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';
import { getActionErrorLogRoute } from './get_action_error_log';
import { getRuleExecutionKPIRoute } from './get_rule_execution_kpi';
import { getRuleStateRoute } from './get_rule_state';
import { healthRoute } from './health';
import { resolveRuleRoute } from './resolve_rule';
import { ruleTypesRoute } from './rule_types';
import { muteAllRuleRoute } from './mute_all_rule';
import { muteAlertRoute } from './mute_alert';
import { unmuteAllRuleRoute } from './unmute_all_rule';
import { unmuteAlertRoute } from './unmute_alert';
import { updateRuleApiKeyRoute } from './update_rule_api_key';
import { bulkEditInternalRulesRoute } from './rule/apis/bulk_edit/bulk_edit_rules_route';
import { snoozeRuleRoute } from './snooze_rule';
import { unsnoozeRuleRoute } from './unsnooze_rule';
import { runSoonRoute } from './run_soon';
import { bulkDeleteRulesRoute } from './bulk_delete_rules';
import { bulkEnableRulesRoute } from './bulk_enable_rules';
import { bulkDisableRulesRoute } from './bulk_disable_rules';
import { cloneRuleRoute } from './clone_rule';
import { getFlappingSettingsRoute } from './get_flapping_settings';
import { updateFlappingSettingsRoute } from './update_flapping_settings';
import { getRuleTagsRoute } from './get_rule_tags';

import { createMaintenanceWindowRoute } from './maintenance_window/create_maintenance_window';
import { getMaintenanceWindowRoute } from './maintenance_window/get_maintenance_window';
import { updateMaintenanceWindowRoute } from './maintenance_window/update_maintenance_window';
import { deleteMaintenanceWindowRoute } from './maintenance_window/delete_maintenance_window';
import { findMaintenanceWindowsRoute } from './maintenance_window/find_maintenance_windows';
import { archiveMaintenanceWindowRoute } from './maintenance_window/archive_maintenance_window';
import { finishMaintenanceWindowRoute } from './maintenance_window/finish_maintenance_window';
import { activeMaintenanceWindowsRoute } from './maintenance_window/active_maintenance_windows';
import { registerRulesValueSuggestionsRoute } from './suggestions/values_suggestion_rules';
import { registerFieldsRoute } from './suggestions/fields_rules';
import { bulkGetMaintenanceWindowRoute } from './maintenance_window/bulk_get_maintenance_windows';
import { registerAlertsValueSuggestionsRoute } from './suggestions/values_suggestion_alerts';

export interface RouteOptions {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  getAlertIndicesAlias?: GetAlertIndicesAlias;
  usageCounter?: UsageCounter;
  config$?: Observable<ConfigSchema>;
}

export function defineRoutes(opts: RouteOptions) {
  const {
    router,
    licenseState,
    encryptedSavedObjects,
    usageCounter,
    config$,
    getAlertIndicesAlias,
  } = opts;

  defineLegacyRoutes(opts);
  createRuleRoute(opts);
  getRuleRoute(router, licenseState);
  getInternalRuleRoute(router, licenseState);
  resolveRuleRoute(router, licenseState);
  updateRuleRoute(router, licenseState);
  deleteRuleRoute(router, licenseState);
  aggregateRulesRoute(router, licenseState);
  disableRuleRoute(router, licenseState);
  enableRuleRoute(router, licenseState);
  findRulesRoute(router, licenseState, usageCounter);
  findInternalRulesRoute(router, licenseState, usageCounter);
  getRuleAlertSummaryRoute(router, licenseState);
  getRuleExecutionLogRoute(router, licenseState);
  getGlobalExecutionLogRoute(router, licenseState);
  getActionErrorLogRoute(router, licenseState);
  getRuleExecutionKPIRoute(router, licenseState);
  getGlobalExecutionKPIRoute(router, licenseState);
  getRuleStateRoute(router, licenseState);
  healthRoute(router, licenseState, encryptedSavedObjects);
  ruleTypesRoute(router, licenseState);
  muteAllRuleRoute(router, licenseState, usageCounter);
  muteAlertRoute(router, licenseState);
  unmuteAllRuleRoute(router, licenseState);
  unmuteAlertRoute(router, licenseState);
  updateRuleApiKeyRoute(router, licenseState);
  bulkEditInternalRulesRoute(router, licenseState);
  bulkDeleteRulesRoute({ router, licenseState });
  bulkEnableRulesRoute({ router, licenseState });
  bulkDisableRulesRoute({ router, licenseState });
  snoozeRuleRoute(router, licenseState);
  unsnoozeRuleRoute(router, licenseState);
  runSoonRoute(router, licenseState);
  cloneRuleRoute(router, licenseState);
  getFlappingSettingsRoute(router, licenseState);
  updateFlappingSettingsRoute(router, licenseState);
  getRuleTagsRoute(router, licenseState);
  createMaintenanceWindowRoute(router, licenseState);
  getMaintenanceWindowRoute(router, licenseState);
  updateMaintenanceWindowRoute(router, licenseState);
  deleteMaintenanceWindowRoute(router, licenseState);
  findMaintenanceWindowsRoute(router, licenseState);
  archiveMaintenanceWindowRoute(router, licenseState);
  finishMaintenanceWindowRoute(router, licenseState);
  activeMaintenanceWindowsRoute(router, licenseState);
  registerAlertsValueSuggestionsRoute(router, licenseState, config$!, getAlertIndicesAlias);
  registerRulesValueSuggestionsRoute(router, licenseState, config$!);
  registerFieldsRoute(router, licenseState);
  bulkGetMaintenanceWindowRoute(router, licenseState);
}
