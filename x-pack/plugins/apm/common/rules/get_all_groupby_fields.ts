/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { union } from 'lodash';
import { ApmRuleType } from './apm_rule_types';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../es_fields/apm';

export const getAllGroupByFields = (
  ruleType: string,
  groupBy: string[] | undefined = []
) => {
  const predefinedGroupBy =
    ruleType === ApmRuleType.TransactionDuration ||
    ruleType === ApmRuleType.TransactionErrorRate
      ? [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE]
      : ruleType === ApmRuleType.ErrorCount
      ? [SERVICE_NAME, SERVICE_ENVIRONMENT]
      : [];

  return union(predefinedGroupBy, groupBy);
};
