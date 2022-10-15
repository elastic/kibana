/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type * as t from 'io-ts';

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';

import { PrebuiltRuleToInstall } from '../../../../../common/detection_engine/prebuilt_rules';
import type { ConfigType } from '../../../../config';
import { withSecuritySpan } from '../../../../utils/with_security_span';

// TODO: convert rules files to TS and add explicit type definitions
import { rawRules } from '../content/prepackaged_rules';
import type {
  RuleAssetSavedObjectsClient,
  IRuleAssetSOAttributes,
} from './rule_asset/rule_asset_saved_objects_client';

export const getLatestPrebuiltRules = async (
  client: RuleAssetSavedObjectsClient,
  prebuiltRulesFromFileSystem: ConfigType['prebuiltRulesFromFileSystem'],
  prebuiltRulesFromSavedObjects: ConfigType['prebuiltRulesFromSavedObjects']
): Promise<Map<string, PrebuiltRuleToInstall>> =>
  withSecuritySpan('getLatestPrebuiltRules', async () => {
    // build a map of the most recent version of each rule
    const prebuilt = prebuiltRulesFromFileSystem ? getFilesystemRules() : [];
    const ruleMap = new Map(prebuilt.map((r) => [r.rule_id, r]));

    // check the rules installed via fleet and create/update if the version is newer
    if (prebuiltRulesFromSavedObjects) {
      const fleetRules = await getFleetRules(client);
      fleetRules.forEach((fleetRule) => {
        const fsRule = ruleMap.get(fleetRule.rule_id);

        if (fsRule == null || fsRule.version < fleetRule.version) {
          // add the new or updated rules to the map
          ruleMap.set(fleetRule.rule_id, fleetRule);
        }
      });
    }

    return ruleMap;
  });

/**
 * Retrieve and validate prebuilt rules from "file system" (content/prepackaged_rules).
 */
export const getFilesystemRules = (
  // @ts-expect-error mock data is too loosely typed
  rules: PrebuiltRuleToInstall[] = rawRules
): PrebuiltRuleToInstall[] => {
  return validateFilesystemRules(rules);
};

/**
 * Validate the rules from the file system and throw any errors indicating to the developer
 * that they are adding incorrect schema rules. Also this will auto-flush in all the default
 * aspects such as default interval of 5 minutes, default arrays, etc...
 */
const validateFilesystemRules = (
  rules: PrebuiltRuleToInstall[]
): PrebuiltRuleToInstall[] => {
  return rules.map((rule) => {
    const decoded = PrebuiltRuleToInstall.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): PrebuiltRuleToInstall => {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the folder content/prepackaged_rules ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${formatErrors(
            errors
          ).join()}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    };

    const onRight = (schema: PrebuiltRuleToInstall): PrebuiltRuleToInstall => {
      return schema as PrebuiltRuleToInstall;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};

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

    const onRight = (schema: PrebuiltRuleToInstall): PrebuiltRuleToInstall => {
      return schema as PrebuiltRuleToInstall;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};
