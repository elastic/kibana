/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import type {
  BulkCreateRulesRequestBody,
  BulkPatchRulesRequestBody,
  BulkUpdateRulesRequestBody,
} from '../../../../../../common/detection_engine/rule_management';
/**
 * Check if rule has duplicated default exceptions lits
 */
export const getRulesIndexesWithDuplicatedDefaultExceptionsList = (
  rules: BulkCreateRulesRequestBody | BulkPatchRulesRequestBody | BulkUpdateRulesRequestBody
): number[] => {
  const defaultExceptionToTuRulesMap: { [key: string]: number[] } = {};

  rules.forEach((rule, ruleIndex) => {
    rule.exceptions_list?.forEach((list) => {
      if (list.type === ExceptionListTypeEnum.RULE_DEFAULT) {
        defaultExceptionToTuRulesMap[list.id] ??= [];
        defaultExceptionToTuRulesMap[list.id].push(ruleIndex);
      }
    });
  });

  const rulesIndexesWithDuplicatedDefaultExceptionsList = new Set<number>();

  Object.values(defaultExceptionToTuRulesMap).forEach((rulesIndexes) => {
    if (rulesIndexes.length > 1) {
      rulesIndexes.forEach((index) => rulesIndexesWithDuplicatedDefaultExceptionsList.add(index));
    }
  });

  return Array.from(rulesIndexesWithDuplicatedDefaultExceptionsList);
};
