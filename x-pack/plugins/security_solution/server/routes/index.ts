/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor, Logger } from '@kbn/core/server';
import type { IRuleDataClient, RuleDataPluginService } from '@kbn/rule-registry-plugin/server';

import type { SecuritySolutionPluginRouter } from '../types';

import { createRulesRoute } from '../lib/detection_engine/routes/rules/create_rules_route';
import { createIndexRoute } from '../lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from '../lib/detection_engine/routes/index/read_index_route';
import { readRulesRoute } from '../lib/detection_engine/routes/rules/read_rules_route';
import { findRulesRoute } from '../lib/detection_engine/routes/rules/find_rules_route';
import { deleteRulesRoute } from '../lib/detection_engine/routes/rules/delete_rules_route';
import { updateRulesRoute } from '../lib/detection_engine/routes/rules/update_rules_route';
import { patchRulesRoute } from '../lib/detection_engine/routes/rules/patch_rules_route';
import { createSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/create_signals_migration_route';
import { deleteSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/delete_signals_migration_route';
import { finalizeSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/finalize_signals_migration_route';
import { getSignalsMigrationStatusRoute } from '../lib/detection_engine/routes/signals/get_signals_migration_status_route';
import { querySignalsRoute } from '../lib/detection_engine/routes/signals/query_signals_route';
import { setSignalsStatusRoute } from '../lib/detection_engine/routes/signals/open_close_signals_route';
import { deleteIndexRoute } from '../lib/detection_engine/routes/index/delete_index_route';
import { readTagsRoute } from '../lib/detection_engine/routes/tags/read_tags_route';
import { readPrivilegesRoute } from '../lib/detection_engine/routes/privileges/read_privileges_route';
import { addPrepackedRulesRoute } from '../lib/detection_engine/routes/rules/add_prepackaged_rules_route';
import { createRulesBulkRoute } from '../lib/detection_engine/routes/rules/create_rules_bulk_route';
import { updateRulesBulkRoute } from '../lib/detection_engine/routes/rules/update_rules_bulk_route';
import { patchRulesBulkRoute } from '../lib/detection_engine/routes/rules/patch_rules_bulk_route';
import { deleteRulesBulkRoute } from '../lib/detection_engine/routes/rules/delete_rules_bulk_route';
import { performBulkActionRoute } from '../lib/detection_engine/routes/rules/perform_bulk_action_route';
import { importRulesRoute } from '../lib/detection_engine/routes/rules/import_rules_route';
import { exportRulesRoute } from '../lib/detection_engine/routes/rules/export_rules_route';
import { registerRuleMonitoringRoutes } from '../lib/detection_engine/rule_monitoring';
import { getPrepackagedRulesStatusRoute } from '../lib/detection_engine/routes/rules/get_prepackaged_rules_status_route';
import {
  createTimelinesRoute,
  deleteTimelinesRoute,
  exportTimelinesRoute,
  getTimelineRoute,
  getTimelinesRoute,
  importTimelinesRoute,
  patchTimelinesRoute,
  persistFavoriteRoute,
  resolveTimelineRoute,
} from '../lib/timeline/routes/timelines';
import { getDraftTimelinesRoute } from '../lib/timeline/routes/draft_timelines/get_draft_timelines';
import { cleanDraftTimelinesRoute } from '../lib/timeline/routes/draft_timelines/clean_draft_timelines';

import { persistNoteRoute } from '../lib/timeline/routes/notes';

import { persistPinnedEventRoute } from '../lib/timeline/routes/pinned_events';

import type { SetupPlugins, StartPlugins } from '../plugin';
import type { ConfigType } from '../config';
import type { ITelemetryEventsSender } from '../lib/telemetry/sender';
import { installPrepackedTimelinesRoute } from '../lib/timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
import { previewRulesRoute } from '../lib/detection_engine/routes/rules/preview_rules_route';
import type {
  CreateRuleOptions,
  CreateSecurityRuleTypeWrapperProps,
} from '../lib/detection_engine/rule_types/types';
// eslint-disable-next-line no-restricted-imports
import { legacyCreateLegacyNotificationRoute } from '../lib/detection_engine/routes/rules/legacy_create_legacy_notification';
import { createSourcererDataViewRoute, getSourcererDataViewRoute } from '../lib/sourcerer/routes';
import type { ITelemetryReceiver } from '../lib/telemetry/receiver';
import { telemetryDetectionRulesPreviewRoute } from '../lib/detection_engine/routes/telemetry/telemetry_detection_rules_preview_route';
import { readAlertsIndexExistsRoute } from '../lib/detection_engine/routes/index/read_alerts_index_exists_route';
import { getInstalledIntegrationsRoute } from '../lib/detection_engine/routes/fleet/get_installed_integrations/get_installed_integrations_route';
import { registerResolverRoutes } from '../endpoint/routes/resolver';
import { findRuleExceptionReferencesRoute } from '../lib/detection_engine/routes/rules/find_rule_exceptions_route';
import { createRuleExceptionsRoute } from '../lib/detection_engine/routes/rules/create_rule_exceptions_route';
import {
  createEsIndexRoute,
  createPrebuiltSavedObjectsRoute,
  createStoredScriptRoute,
  deleteEsIndicesRoute,
  deletePrebuiltSavedObjectsRoute,
  deleteStoredScriptRoute,
  getRiskScoreIndexStatusRoute,
  readPrebuiltDevToolContentRoute,
} from '../lib/risk_score/routes';
export const initRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  hasEncryptionKey: boolean,
  security: SetupPlugins['security'],
  telemetrySender: ITelemetryEventsSender,
  ml: SetupPlugins['ml'],
  ruleDataService: RuleDataPluginService,
  logger: Logger,
  ruleDataClient: IRuleDataClient | null,
  ruleOptions: CreateRuleOptions,
  getStartServices: StartServicesAccessor<StartPlugins>,
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  previewRuleDataClient: IRuleDataClient,
  previewTelemetryReceiver: ITelemetryReceiver
) => {
  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc
  createRulesRoute(router, ml);
  readRulesRoute(router, logger);
  updateRulesRoute(router, ml);
  patchRulesRoute(router, ml);
  deleteRulesRoute(router);
  findRulesRoute(router, logger);
  previewRulesRoute(
    router,
    config,
    ml,
    security,
    ruleOptions,
    securityRuleTypeOptions,
    previewRuleDataClient,
    getStartServices
  );
  createRuleExceptionsRoute(router);

  // Once we no longer have the legacy notifications system/"side car actions" this should be removed.
  legacyCreateLegacyNotificationRoute(router, logger);

  addPrepackedRulesRoute(router);
  getPrepackagedRulesStatusRoute(router, config, security);
  createRulesBulkRoute(router, ml, logger);
  updateRulesBulkRoute(router, ml, logger);
  patchRulesBulkRoute(router, ml, logger);
  deleteRulesBulkRoute(router, logger);
  performBulkActionRoute(router, ml, logger);
  registerResolverRoutes(router, getStartServices, config);

  registerRuleMonitoringRoutes(router);

  getInstalledIntegrationsRoute(router, logger);

  createTimelinesRoute(router, config, security);
  patchTimelinesRoute(router, config, security);
  importRulesRoute(router, config, ml);
  exportRulesRoute(router, config, logger);
  findRuleExceptionReferencesRoute(router);

  importTimelinesRoute(router, config, security);
  exportTimelinesRoute(router, config, security);
  getDraftTimelinesRoute(router, config, security);
  getTimelineRoute(router, config, security);
  resolveTimelineRoute(router, config, security);
  getTimelinesRoute(router, config, security);
  cleanDraftTimelinesRoute(router, config, security);
  deleteTimelinesRoute(router, config, security);
  persistFavoriteRoute(router, config, security);

  installPrepackedTimelinesRoute(router, config, security);

  persistNoteRoute(router, config, security);
  persistPinnedEventRoute(router, config, security);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in security_solution/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(router, logger, security, telemetrySender);
  querySignalsRoute(router, ruleDataClient);
  getSignalsMigrationStatusRoute(router);
  createSignalsMigrationRoute(router, security);
  finalizeSignalsMigrationRoute(router, ruleDataService, security);
  deleteSignalsMigrationRoute(router, security);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(router);
  readIndexRoute(router, ruleDataService);
  readAlertsIndexExistsRoute(router);
  deleteIndexRoute(router);

  // Detection Engine tags routes that have the REST endpoints of /api/detection_engine/tags
  readTagsRoute(router);

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(router, hasEncryptionKey);

  // Sourcerer API to generate default pattern
  createSourcererDataViewRoute(router, getStartServices);
  getSourcererDataViewRoute(router, getStartServices);

  // risky score module
  createEsIndexRoute(router);
  deleteEsIndicesRoute(router);
  createStoredScriptRoute(router);
  deleteStoredScriptRoute(router);
  readPrebuiltDevToolContentRoute(router);
  createPrebuiltSavedObjectsRoute(router, security);
  deletePrebuiltSavedObjectsRoute(router, security);
  getRiskScoreIndexStatusRoute(router);

  const { previewTelemetryUrlEnabled } = config.experimentalFeatures;
  if (previewTelemetryUrlEnabled) {
    // telemetry preview endpoint for e2e integration tests only at the moment.
    telemetryDetectionRulesPreviewRoute(router, logger, previewTelemetryReceiver, telemetrySender);
  }
};
