/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { defineLegacyRoutes } from './legacy';
import { AlertingRequestHandlerContext } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import { createRuleRoute } from './create_rule';
import { getRuleRoute } from './get_rule';
import { updateRuleRoute } from './update_rule';
import { deleteRuleRoute } from './delete_rule';
import { aggregateRulesRoute } from './aggregate_rules';
import { disableRuleRoute } from './disable_rule';
import { enableRuleRoute } from './enable_rule';
import { findRulesRoute } from './find_rules';
import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { getRuleStateRoute } from './get_rule_state';
import { healthRoute } from './health';
import { ruleTypesRoute } from './rule_types';
import { muteAllRuleRoute } from './mute_all_rule';
import { muteAlertRoute } from './mute_alert';
import { unmuteAllRuleRoute } from './unmute_all_rule';
import { unmuteAlertRoute } from './unmute_alert';
import { updateRuleApiKeyRoute } from './update_rule_api_key';

export function defineRoutes(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  defineLegacyRoutes(router, licenseState, encryptedSavedObjects);
  createRuleRoute(router, licenseState);
  getRuleRoute(router, licenseState);
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
