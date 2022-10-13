/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor, Logger } from '@kbn/core/server';
import type { IRuleDataClient, RuleDataPluginService } from '@kbn/rule-registry-plugin/server';

import type { SecuritySolutionPluginRouter } from '../types';

import { registerFleetIntegrationsRoutes } from '../lib/detection_engine/fleet_integrations';
import { registerPrebuiltRulesRoutes } from '../lib/detection_engine/prebuilt_rules';
// eslint-disable-next-line no-restricted-imports
import { registerLegacyRuleActionsRoutes } from '../lib/detection_engine/rule_actions_legacy';
import { registerRuleExceptionsRoutes } from '../lib/detection_engine/rule_exceptions';
import { registerRuleManagementRoutes } from '../lib/detection_engine/rule_management';
import { registerRuleMonitoringRoutes } from '../lib/detection_engine/rule_monitoring';
import { registerRulePreviewRoutes } from '../lib/detection_engine/rule_preview';

import { createIndexRoute } from '../lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from '../lib/detection_engine/routes/index/read_index_route';
import { createSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/create_signals_migration_route';
import { deleteSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/delete_signals_migration_route';
import { finalizeSignalsMigrationRoute } from '../lib/detection_engine/routes/signals/finalize_signals_migration_route';
import { getSignalsMigrationStatusRoute } from '../lib/detection_engine/routes/signals/get_signals_migration_status_route';
import { querySignalsRoute } from '../lib/detection_engine/routes/signals/query_signals_route';
import { setSignalsStatusRoute } from '../lib/detection_engine/routes/signals/open_close_signals_route';
import { deleteIndexRoute } from '../lib/detection_engine/routes/index/delete_index_route';
import { readPrivilegesRoute } from '../lib/detection_engine/routes/privileges/read_privileges_route';
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
import type {
  CreateRuleOptions,
  CreateSecurityRuleTypeWrapperProps,
} from '../lib/detection_engine/rule_types/types';
import { createSourcererDataViewRoute, getSourcererDataViewRoute } from '../lib/sourcerer/routes';
import type { ITelemetryReceiver } from '../lib/telemetry/receiver';
import { telemetryDetectionRulesPreviewRoute } from '../lib/detection_engine/routes/telemetry/telemetry_detection_rules_preview_route';
import { readAlertsIndexExistsRoute } from '../lib/detection_engine/routes/index/read_alerts_index_exists_route';
import { registerResolverRoutes } from '../endpoint/routes/resolver';
import {
  createEsIndexRoute,
  createPrebuiltSavedObjectsRoute,
  createStoredScriptRoute,
  deleteEsIndicesRoute,
  deletePrebuiltSavedObjectsRoute,
  deleteStoredScriptRoute,
  getRiskScoreIndexStatusRoute,
  installRiskScoresRoute,
  readPrebuiltDevToolContentRoute,
  restartTransformRoute,
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
  registerFleetIntegrationsRoutes(router, logger);
  registerLegacyRuleActionsRoutes(router, logger);
  registerPrebuiltRulesRoutes(router, config, security);
  registerRuleExceptionsRoutes(router);
  registerRuleManagementRoutes(router, config, ml, logger);
  registerRuleMonitoringRoutes(router);
  registerRulePreviewRoutes(
    router,
    config,
    ml,
    security,
    ruleOptions,
    securityRuleTypeOptions,
    previewRuleDataClient,
    getStartServices
  );

  registerResolverRoutes(router, getStartServices, config);

  createTimelinesRoute(router, config, security);
  patchTimelinesRoute(router, config, security);

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

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(router, hasEncryptionKey);

  // Sourcerer API to generate default pattern
  createSourcererDataViewRoute(router, getStartServices);
  getSourcererDataViewRoute(router, getStartServices);

  // risky score module
  createEsIndexRoute(router, logger);
  deleteEsIndicesRoute(router);
  createStoredScriptRoute(router, logger);
  deleteStoredScriptRoute(router);
  readPrebuiltDevToolContentRoute(router);
  createPrebuiltSavedObjectsRoute(router, logger, security);
  deletePrebuiltSavedObjectsRoute(router, security);
  getRiskScoreIndexStatusRoute(router);
  installRiskScoresRoute(router, logger, security);
  restartTransformRoute(router, logger);
  const { previewTelemetryUrlEnabled } = config.experimentalFeatures;
  if (previewTelemetryUrlEnabled) {
    // telemetry preview endpoint for e2e integration tests only at the moment.
    telemetryDetectionRulesPreviewRoute(router, logger, previewTelemetryReceiver, telemetrySender);
  }
};
