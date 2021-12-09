/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedSanitizedRule, SanitizedRule } from '../../../../../alerting/common';
import { INTERNAL_RULE_ID_KEY } from '../../../../common/constants';
import { RuleParams } from '../schemas/rule_schemas';
import { findRules } from './find_rules';
import { isAlertType, ReadRuleOptions } from './types';

/**
 * This reads the rules through a cascade try of what is fastest to what is slowest.
 * @param id - This is the fastest. This is the auto-generated id through the parameter id.
 * and the id will either be found through `rulesClient.get({ id })` or it will not
 * be returned as a not-found or a thrown error that is not 404.
 * @param ruleId - This is a close second to being fast as long as it can find the rule_id from
 * a filter query against the tags using `alert.attributes.tags: "__internal:${ruleId}"]`
 */
export const readRules = async ({
  isRuleRegistryEnabled,
  rulesClient,
  id,
  ruleId,
}: ReadRuleOptions): Promise<
  SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams> | null
> => {
  if (id != null) {
    try {
      const rule = await rulesClient.resolve({ id });
      if (isAlertType(isRuleRegistryEnabled, rule)) {
        if (rule?.outcome === 'exactMatch') {
          const { outcome, ...restOfRule } = rule;
          return restOfRule;
        }
        return rule;
      } else {
        return null;
      }
    } catch (err) {
      if (err?.output?.statusCode === 404) {
        return null;
      } else {
        // throw non-404 as they would be 500 or other internal errors
        throw err;
      }
    }
  } else if (ruleId != null) {
    const ruleFromFind = await findRules({
      isRuleRegistryEnabled,
      rulesClient,
      filter: `alert.attributes.tags: "${INTERNAL_RULE_ID_KEY}:${ruleId}"`,
      page: 1,
      fields: undefined,
      perPage: undefined,
      sortField: undefined,
      sortOrder: undefined,
    });
    if (
      ruleFromFind.data.length === 0 ||
      !isAlertType(isRuleRegistryEnabled, ruleFromFind.data[0])
    ) {
      return null;
    } else {
      return ruleFromFind.data[0];
    }
  } else {
    // should never get here, and yet here we are.
    return null;
  }
};
