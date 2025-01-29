/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { union } from 'lodash';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { SERVICE_ENVIRONMENT, SERVICE_NAME, TRANSACTION_TYPE } from '../es_fields/apm';

export const getAllGroupByFields = (
  ruleType: string,
  ruleParamsGroupByFields: string[] | undefined = []
) => {
  let predefinedGroupByFields: string[] = [];

  switch (ruleType) {
    case ApmRuleType.TransactionDuration:
    case ApmRuleType.TransactionErrorRate:
      predefinedGroupByFields = [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE];
      break;
    case ApmRuleType.ErrorCount:
      predefinedGroupByFields = [SERVICE_NAME, SERVICE_ENVIRONMENT];
      break;
  }

  return union(predefinedGroupByFields, ruleParamsGroupByFields);
};
