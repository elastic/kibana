/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSACTION_NAME } from '../../../../common/es_fields/apm';

export const getGroupByActionVariables = (
  groupByFields: Record<string, string>
): Record<string, string> => {
  return Object.keys(groupByFields).reduce<Record<string, string>>(
    (acc, cur) => {
      acc[cur === TRANSACTION_NAME ? 'transactionName' : cur] =
        groupByFields[cur];
      return acc;
    },
    {}
  );
};
