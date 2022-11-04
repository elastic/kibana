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
import { bulkCreateRulesRoute } from './rules/bulk_create_rules/route';
import { bulkDeleteRulesRoute } from './rules/bulk_delete_rules/route';
import { bulkPatchRulesRoute } from './rules/bulk_patch_rules/route';
import { bulkUpdateRulesRoute } from './rules/bulk_update_rules/route';
import { createRuleRoute } from './rules/create_rule/route';
import { deleteRuleRoute } from './rules/delete_rule/route';
import { exportRulesRoute } from './rules/export_rules/route';
import { findRulesRoute } from './rules/find_rules/route';
import { importRulesRoute } from './rules/import_rules/route';
import { patchRuleRoute } from './rules/patch_rule/route';
import { readRuleRoute } from './rules/read_rule/route';
import { updateRuleRoute } from './rules/update_rule/route';
import { readTagsRoute } from './tags/read_tags/route';

export const registerRuleManagementRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  // Rules CRUD
  createRuleRoute(router, ml);
  readRuleRoute(router, logger);
  updateRuleRoute(router, ml);
  patchRuleRoute(router, ml);
  deleteRuleRoute(router);

  // Rules bulk CRUD
  bulkCreateRulesRoute(router, ml, logger);
  bulkUpdateRulesRoute(router, ml, logger);
  bulkPatchRulesRoute(router, ml, logger);
  bulkDeleteRulesRoute(router, logger);

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
