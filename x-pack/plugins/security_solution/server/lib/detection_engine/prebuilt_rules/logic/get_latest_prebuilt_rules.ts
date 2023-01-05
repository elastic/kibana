/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { getOrElse } from 'fp-ts/lib/Either';
import type * as t from 'io-ts';
import { PrebuiltRuleToInstall } from '../../../../../common/detection_engine/prebuilt_rules';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  IRuleAssetSOAttributes,
  RuleAssetSavedObjectsClient,
} from './rule_asset/rule_asset_saved_objects_client';

export const getLatestPrebuiltRules = async (
  client: RuleAssetSavedObjectsClient
): Promise<Map<string, PrebuiltRuleToInstall>> =>
  withSecuritySpan('getLatestPrebuiltRules', async () => {
    const fleetRules = await getFleetRules(client);
    return new Map(fleetRules.map((rule) => [rule.rule_id, rule]));
  });

/**
 * Retrieve and validate prebuilt rules that were installed from Fleet as saved objects.
 */
const getFleetRules = async (
  client: RuleAssetSavedObjectsClient
): Promise<PrebuiltRuleToInstall[]> => {
  const fleetResponse = await client.all();
  const fleetRules = fleetResponse.map((so) => so.attributes);
  return validateFleetRules(fleetRules);
};

/**
 * Validate the rules from Saved Objects created by Fleet.
 */
const validateFleetRules = (rules: IRuleAssetSOAttributes[]): PrebuiltRuleToInstall[] => {
  return rules.map((rule) => {
    const decoded = PrebuiltRuleToInstall.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): PrebuiltRuleToInstall => {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the security-rule saved object ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${formatErrors(
            errors
          ).join()}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    };

    return getOrElse(onLeft)(checked);
  });
};
