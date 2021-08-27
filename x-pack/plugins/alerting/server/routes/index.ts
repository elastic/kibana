/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import type { IUsageCounter as UsageCounter } from '../../../../../src/plugins/usage_collection/server/usage_counters/usage_counter';
import type { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server/plugin';
import type { ILicenseState } from '../lib/license_state';
import type { AlertingRequestHandlerContext } from '../types';
import { aggregateRulesRoute } from './aggregate_rules';
import { createRuleRoute } from './create_rule';
import { deleteRuleRoute } from './delete_rule';
import { disableRuleRoute } from './disable_rule';
import { enableRuleRoute } from './enable_rule';
import { findRulesRoute } from './find_rules';
import { getRuleRoute } from './get_rule';
import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { getRuleStateRoute } from './get_rule_state';
import { healthRoute } from './health';
import { defineLegacyRoutes } from './legacy';
import { muteAlertRoute } from './mute_alert';
import { muteAllRuleRoute } from './mute_all_rule';
import { resolveRuleRoute } from './resolve_rule';
import { ruleTypesRoute } from './rule_types';
import { unmuteAlertRoute } from './unmute_alert';
import { unmuteAllRuleRoute } from './unmute_all_rule';
import { updateRuleRoute } from './update_rule';
import { updateRuleApiKeyRoute } from './update_rule_api_key';

export interface RouteOptions {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  usageCounter?: UsageCounter;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState, encryptedSavedObjects } = opts;

  defineLegacyRoutes(opts);
  createRuleRoute(opts);
  getRuleRoute(router, licenseState);
  resolveRuleRoute(router, licenseState);
  updateRuleRoute(router, licenseState);
  deleteRuleRoute(router, licenseState);
  aggregateRulesRoute(router, licenseState);
  disableRuleRoute(router, licenseState);
  enableRuleRoute(router, licenseState);
  findRulesRoute(router, licenseState);
  getRuleAlertSummaryRoute(router, licenseState);
  getRuleStateRoute(router, licenseState);
  healthRoute(router, licenseState, encryptedSavedObjects);
  ruleTypesRoute(router, licenseState);
  muteAllRuleRoute(router, licenseState);
  muteAlertRoute(router, licenseState);
  unmuteAllRuleRoute(router, licenseState);
  unmuteAlertRoute(router, licenseState);
  updateRuleApiKeyRoute(router, licenseState);
}
