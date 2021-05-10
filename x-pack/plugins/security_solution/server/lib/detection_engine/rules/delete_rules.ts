/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readRules } from './read_rules';
import { DeleteRuleOptions } from './types';

export const deleteRules = async ({ alertsClient, id, ruleId }: DeleteRuleOptions) => {
  const rule = await readRules({ alertsClient, id, ruleId });
  if (rule == null) {
    return null;
  }

  if (ruleId != null) {
    await alertsClient.delete({ id: rule.id });
    return rule;
  } else if (id != null) {
    try {
      await alertsClient.delete({ id });
      return rule;
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
