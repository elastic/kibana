/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FindRulesSchema } from './find_rules_schema';

export const validateSortOrder = (find: FindRulesSchema): string[] => {
  if (find.sort_order != null || find.sort_field != null) {
    if (find.sort_order == null || find.sort_field == null) {
      return ['when "sort_order" and "sort_field" must exist together or not at all'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const findRuleValidateTypeDependents = (schema: FindRulesSchema): string[] => {
  return [...validateSortOrder(schema)];
};
