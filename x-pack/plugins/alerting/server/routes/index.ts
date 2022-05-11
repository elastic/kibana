/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { ILicenseState } from '../lib';
import { defineLegacyRoutes } from './legacy';
import { AlertingRequestHandlerContext } from '../types';
import { createRuleRoute } from './create_rule';
import { getRuleRoute, getInternalRuleRoute } from './get_rule';
import { updateRuleRoute } from './update_rule';
import { deleteRuleRoute } from './delete_rule';
import { aggregateRulesRoute } from './aggregate_rules';
import { disableRuleRoute } from './disable_rule';
import { enableRuleRoute } from './enable_rule';
import { findRulesRoute, findInternalRulesRoute } from './find_rules';
import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { getRuleExecutionLogRoute } from './get_rule_execution_log';
import { getRuleStateRoute } from './get_rule_state';
import { healthRoute } from './health';
import { resolveRuleRoute } from './resolve_rule';
import { ruleTypesRoute } from './rule_types';
import { muteAllRuleRoute } from './mute_all_rule';
import { muteAlertRoute } from './mute_alert';
import { unmuteAllRuleRoute } from './unmute_all_rule';
import { unmuteAlertRoute } from './unmute_alert';
import { updateRuleApiKeyRoute } from './update_rule_api_key';
import { bulkEditInternalRulesRoute } from './bulk_edit_rules';
import { snoozeRuleRoute } from './snooze_rule';
import { unsnoozeRuleRoute } from './unsnooze_rule';

export interface RouteOptions {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  usageCounter?: UsageCounter;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState, encryptedSavedObjects, usageCounter } = opts;

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
  getRuleStateRoute(router, licenseState);
  healthRoute(router, licenseState, encryptedSavedObjects);
  ruleTypesRoute(router, licenseState);
  muteAllRuleRoute(router, licenseState, usageCounter);
  muteAlertRoute(router, licenseState);
  unmuteAllRuleRoute(router, licenseState);
  unmuteAlertRoute(router, licenseState);
  updateRuleApiKeyRoute(router, licenseState);
  bulkEditInternalRulesRoute(router, licenseState);
  snoozeRuleRoute(router, licenseState);
  unsnoozeRuleRoute(router, licenseState);
}
