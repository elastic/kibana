/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConfigType } from '../../../../config';
import type { SetupPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { performBulkActionRoute } from './rules/bulk_actions/route';
import { createRulesBulkRoute } from './rules/bulk_create_rules/route';
import { deleteRulesBulkRoute } from './rules/bulk_delete_rules/route';
import { patchRulesBulkRoute } from './rules/bulk_patch_rules/route';
import { updateRulesBulkRoute } from './rules/bulk_update_rules/route';
import { createRulesRoute } from './rules/create_rule/route';
import { deleteRulesRoute } from './rules/delete_rule/route';
import { exportRulesRoute } from './rules/export_rules/route';
import { findRulesRoute } from './rules/find_rules/route';
import { importRulesRoute } from './rules/import_rules/route';
import { patchRulesRoute } from './rules/patch_rule/route';
import { readRulesRoute } from './rules/read_rule/route';
import { updateRulesRoute } from './rules/update_rule/route';
import { readTagsRoute } from './tags/read_tags/route';

export const registerRuleManagementRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  // Rules CRUD
  createRulesRoute(router, ml);
  readRulesRoute(router, logger);
  updateRulesRoute(router, ml);
  patchRulesRoute(router, ml);
  deleteRulesRoute(router);

  // Rules bulk CRUD
  createRulesBulkRoute(router, ml, logger);
  updateRulesBulkRoute(router, ml, logger);
  patchRulesBulkRoute(router, ml, logger);
  deleteRulesBulkRoute(router, logger);

  // Rules bulk actions
  performBulkActionRoute(router, ml, logger);

  // Rules export/import
  exportRulesRoute(router, config, logger);
  importRulesRoute(router, config, ml);

  // Rules search
  findRulesRoute(router, logger);

  // Rule tags
  readTagsRoute(router);
};
