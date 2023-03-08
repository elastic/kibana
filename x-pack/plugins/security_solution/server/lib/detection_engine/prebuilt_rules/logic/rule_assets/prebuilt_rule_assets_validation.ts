/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { getOrElse } from 'fp-ts/lib/Either';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

export const validatePrebuiltRuleAssets = (rules: PrebuiltRuleAsset[]): PrebuiltRuleAsset[] => {
  return rules.map((rule) => validatePrebuiltRuleAsset(rule));
};

export const validatePrebuiltRuleAsset = (rule: PrebuiltRuleAsset): PrebuiltRuleAsset => {
  const decoded = PrebuiltRuleAsset.decode(rule);
  const checked = exactCheck(rule, decoded);

  const onLeft = (errors: t.Errors): PrebuiltRuleAsset => {
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
};
