/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readRules } from './read_rules';
import { DeleteRuleOptions } from './types';

export const deleteRules = async ({ alertsClient, id, ruleId }: DeleteRuleOptions) => {
  const rules = await readRules({ alertsClient, id, ruleIds: ruleId ? [ruleId] : undefined });
  if (rules == null || rules.length === 0) {
    return null;
  }

  if (ruleId != null) {
    await alertsClient.delete({ id: rules[0].id });
    return rules[0];
  } else if (id != null) {
    try {
      await alertsClient.delete({ id });
      return rules[0];
    } catch (err) {
      if (err.output.statusCode === 404) {
        return null;
      } else {
        throw err;
      }
    }
  } else {
    return null;
  }
};
