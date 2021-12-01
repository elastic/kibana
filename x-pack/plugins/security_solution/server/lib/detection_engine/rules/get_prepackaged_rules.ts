/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  addPrepackagedRulesSchema,
  AddPrepackagedRulesSchema,
  AddPrepackagedRulesSchemaDecoded,
} from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';

// TODO: convert rules files to TS and add explicit type definitions
import { rawRules } from './prepackaged_rules';
import { RuleAssetSavedObjectsClient } from './rule_asset/rule_asset_saved_objects_client';
import { IRuleAssetSOAttributes } from './types';
import { SavedObjectAttributes } from '../../../../../../../src/core/types';
import { ConfigType } from '../../../config';

/**
 * Validate the rules from the file system and throw any errors indicating to the developer
 * that they are adding incorrect schema rules. Also this will auto-flush in all the default
 * aspects such as default interval of 5 minutes, default arrays, etc...
 */
export const validateAllPrepackagedRules = (
  rules: AddPrepackagedRulesSchema[]
): AddPrepackagedRulesSchemaDecoded[] => {
  return rules.map((rule) => {
    const decoded = addPrepackagedRulesSchema.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): AddPrepackagedRulesSchemaDecoded => {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the folder rules/prepackaged_rules ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${formatErrors(
            errors
          ).join()}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    };

    const onRight = (schema: AddPrepackagedRulesSchema): AddPrepackagedRulesSchemaDecoded => {
      return schema as AddPrepackagedRulesSchemaDecoded;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};

/**
 * Validate the rules from Saved Objects created by Fleet.
 */
export const validateAllRuleSavedObjects = (
  rules: Array<IRuleAssetSOAttributes & SavedObjectAttributes>
): AddPrepackagedRulesSchemaDecoded[] => {
  return rules.map((rule) => {
    const decoded = addPrepackagedRulesSchema.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): AddPrepackagedRulesSchemaDecoded => {
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

    const onRight = (schema: AddPrepackagedRulesSchema): AddPrepackagedRulesSchemaDecoded => {
      return schema as AddPrepackagedRulesSchemaDecoded;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};

/**
 * Retrieve and validate rules that were installed from Fleet as saved objects.
 */
export const getFleetInstalledRules = async (
  client: RuleAssetSavedObjectsClient
): Promise<AddPrepackagedRulesSchemaDecoded[]> => {
  const fleetResponse = await client.all();
  const fleetRules = fleetResponse.map((so) => so.attributes);
  return validateAllRuleSavedObjects(fleetRules);
};

export const getPrepackagedRules = (
  // @ts-expect-error mock data is too loosely typed
  rules: AddPrepackagedRulesSchema[] = rawRules
): AddPrepackagedRulesSchemaDecoded[] => {
  return validateAllPrepackagedRules(rules);
};

export const getLatestPrepackagedRules = async (
  client: RuleAssetSavedObjectsClient,
  prebuiltRulesFromFileSystem: ConfigType['prebuiltRulesFromFileSystem'],
  prebuiltRulesFromSavedObjects: ConfigType['prebuiltRulesFromSavedObjects']
): Promise<AddPrepackagedRulesSchemaDecoded[]> => {
  // build a map of the most recent version of each rule
  const prepackaged = prebuiltRulesFromFileSystem ? getPrepackagedRules() : [];
  const ruleMap = new Map(prepackaged.map((r) => [r.rule_id, r]));

  // check the rules installed via fleet and create/update if the version is newer
  if (prebuiltRulesFromSavedObjects) {
    const fleetRules = await getFleetInstalledRules(client);
    const fleetUpdates = fleetRules.filter((r) => {
      const rule = ruleMap.get(r.rule_id);
      return rule == null || rule.version < r.version;
    });

    // add the new or updated rules to the map
    fleetUpdates.forEach((r) => ruleMap.set(r.rule_id, r));
  }

  return Array.from(ruleMap.values());
};
