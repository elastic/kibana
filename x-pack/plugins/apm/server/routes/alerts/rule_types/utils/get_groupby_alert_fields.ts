/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEnvironmentDefined } from '../../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';

export const getAlertFieldsFromGroupBy = (
  groupByFields: Record<string, string>
): Record<string, string> => {
  return Object.keys(groupByFields).reduce<Record<string, string>>(
    (acc, cur) => {
      const fieldValue = groupByFields[cur];
      if (cur === SERVICE_ENVIRONMENT && !isEnvironmentDefined(fieldValue)) {
        return acc;
      }
      acc[cur] = fieldValue;
      return acc;
    },
    {}
  );
};
