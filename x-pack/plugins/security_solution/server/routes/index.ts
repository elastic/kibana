/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../src/core/server';

import { createRulesRoute } from '../lib/detection_engine/routes/rules/create_rules_route';
import { createIndexRoute } from '../lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from '../lib/detection_engine/routes/index/read_index_route';
import { readRulesRoute } from '../lib/detection_engine/routes/rules/read_rules_route';
import { findRulesRoute } from '../lib/detection_engine/routes/rules/find_rules_route';
import { deleteRulesRoute } from '../lib/detection_engine/routes/rules/delete_rules_route';
import { updateRulesRoute } from '../lib/detection_engine/routes/rules/update_rules_route';
import { patchRulesRoute } from '../lib/detection_engine/routes/rules/patch_rules_route';
import { setSignalsStatusRoute } from '../lib/detection_engine/routes/signals/open_close_signals_route';
import { querySignalsRoute } from '../lib/detection_engine/routes/signals/query_signals_route';
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
import { importTimelinesRoute } from '../lib/timeline/routes/import_timelines_route';
import { exportTimelinesRoute } from '../lib/timeline/routes/export_timelines_route';
import { createTimelinesRoute } from '../lib/timeline/routes/create_timelines_route';
import { updateTimelinesRoute } from '../lib/timeline/routes/update_timelines_route';
import { getDraftTimelinesRoute } from '../lib/timeline/routes/get_draft_timelines_route';
import { cleanDraftTimelinesRoute } from '../lib/timeline/routes/clean_draft_timelines_route';
import { SetupPlugins } from '../plugin';
import { ConfigType } from '../config';

export const initRoutes = (
  router: IRouter,
  config: ConfigType,
  usingEphemeralEncryptionKey: boolean,
  security: SetupPlugins['security'],
  ml: SetupPlugins['ml']
) => {
  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc......
  createRulesRoute(router, ml);
  readRulesRoute(router);
  updateRulesRoute(router, ml);
  patchRulesRoute(router, ml);
  deleteRulesRoute(router);
  findRulesRoute(router);

  addPrepackedRulesRoute(router);
  getPrepackagedRulesStatusRoute(router);
  createRulesBulkRoute(router, ml);
  updateRulesBulkRoute(router, ml);
  patchRulesBulkRoute(router, ml);
  deleteRulesBulkRoute(router);

  createTimelinesRoute(router, config, security);
  updateTimelinesRoute(router, config, security);
  importRulesRoute(router, config, ml);
  exportRulesRoute(router, config);

  importTimelinesRoute(router, config, security);
  exportTimelinesRoute(router, config);
  getDraftTimelinesRoute(router, config, security);
  cleanDraftTimelinesRoute(router, config, security);

  findRulesStatusesRoute(router);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in security_solution/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(router);
  querySignalsRoute(router);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(router);
  readIndexRoute(router);
  deleteIndexRoute(router);

  // Detection Engine tags routes that have the REST endpoints of /api/detection_engine/tags
  readTagsRoute(router);

  // Privileges API to get the generic user privileges
  readPrivilegesRoute(router, security, usingEphemeralEncryptionKey);
};
