/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDataClient } from '../../../rule_registry/server';

import { SecuritySolutionPluginRouter } from '../types';

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
import { importRulesRoute } from '../lib/detection_engine/routes/rules/import_rules_route';
import { exportRulesRoute } from '../lib/detection_engine/routes/rules/export_rules_route';
import { findRulesStatusesRoute } from '../lib/detection_engine/routes/rules/find_rules_status_route';
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
} from '../lib/timeline/routes/timelines';
import { getDraftTimelinesRoute } from '../lib/timeline/routes/draft_timelines/get_draft_timelines';
import { cleanDraftTimelinesRoute } from '../lib/timeline/routes/draft_timelines/clean_draft_timelines';

import { persistNoteRoute } from '../lib/timeline/routes/notes';

import { persistPinnedEventRoute } from '../lib/timeline/routes/pinned_events';

import { SetupPlugins } from '../plugin';
import { ConfigType } from '../config';
import { installPrepackedTimelinesRoute } from '../lib/timeline/routes/prepackaged_timelines/install_prepackaged_timelines';

export const initRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  hasEncryptionKey: boolean,
  security: SetupPlugins['security'],
  ml: SetupPlugins['ml'],
  ruleDataClient: RuleDataClient | null
) => {
  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc......
  createRulesRoute(router, ml, ruleDataClient);
  readRulesRoute(router, ruleDataClient);
  updateRulesRoute(router, ml, ruleDataClient);
  patchRulesRoute(router, ml, ruleDataClient);
  deleteRulesRoute(router, ruleDataClient);
  findRulesRoute(router, ruleDataClient);

  // TODO: pass ruleDataClient to all relevant routes

  addPrepackedRulesRoute(router, config, security);
  getPrepackagedRulesStatusRoute(router, config, security);
  createRulesBulkRoute(router, ml);
  updateRulesBulkRoute(router, ml);
  patchRulesBulkRoute(router, ml);
  deleteRulesBulkRoute(router);

  createTimelinesRoute(router, config, security);
  patchTimelinesRoute(router, config, security);
  importRulesRoute(router, config, ml);
  exportRulesRoute(router, config);

  importTimelinesRoute(router, config, security);
  exportTimelinesRoute(router, config, security);
  getDraftTimelinesRoute(router, config, security);
  getTimelineRoute(router, config, security);
  getTimelinesRoute(router, config, security);
  cleanDraftTimelinesRoute(router, config, security);
  deleteTimelinesRoute(router, config, security);
  persistFavoriteRoute(router, config, security);

  installPrepackedTimelinesRoute(router, config, security);

  persistNoteRoute(router, config, security);
  persistPinnedEventRoute(router, config, security);

  findRulesStatusesRoute(router);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in security_solution/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(router);
  querySignalsRoute(router, config);
  getSignalsMigrationStatusRoute(router);
  createSignalsMigrationRoute(router, security);
  finalizeSignalsMigrationRoute(router, security);
  deleteSignalsMigrationRoute(router, security);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(router);
  readIndexRoute(router, config);
  deleteIndexRoute(router);

  // Detection Engine tags routes that have the REST endpoints of /api/detection_engine/tags
  readTagsRoute(router);

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(router, hasEncryptionKey);
};
