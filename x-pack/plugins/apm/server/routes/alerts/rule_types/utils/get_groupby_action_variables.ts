/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldValueLabel } from '../../../../../common/rules/apm_rule_types';
import {
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';

const renameActionVariable = (field: string): string => {
  switch (field) {
    case SERVICE_NAME:
      return 'serviceName';
    case SERVICE_ENVIRONMENT:
      return 'environment';
    case TRANSACTION_TYPE:
      return 'transactionType';
    case TRANSACTION_NAME:
      return 'transactionName';
    case ERROR_GROUP_ID:
      return 'errorGroupingKey';
    case ERROR_GROUP_NAME:
      return 'errorGroupingName';
    default:
      return field;
  }
};

export const getGroupByActionVariables = (
  groupByFields: Record<string, string>
): Record<string, string> => {
  return Object.keys(groupByFields).reduce<Record<string, string>>(
    (acc, cur) => {
      acc[renameActionVariable(cur)] = getFieldValueLabel(
        cur,
        groupByFields[cur]
      );
      return acc;
    },
    {}
  );
};
