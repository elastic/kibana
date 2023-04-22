/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAlertFieldsFromGroupBy = (
  groupByFields: Record<string, string>
): Record<string, string> => {
  return Object.keys(groupByFields).reduce<Record<string, string>>(
    (acc, cur) => {
      const fieldValue = groupByFields[cur];
      if (
        !fieldValue ||
        fieldValue.includes('NOT_DEFINED') ||
        fieldValue.endsWith('_ALL')
      ) {
        return acc;
      }
      acc[cur] = groupByFields[cur];
      return acc;
    },
    {}
  );
};
