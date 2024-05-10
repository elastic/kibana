/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';

export const getGroupByTerms = (groupByFields: string[] | undefined = []) => {
  return groupByFields.map((groupByField) => {
    return {
      field: groupByField,
      missing: groupByField === SERVICE_ENVIRONMENT ? ENVIRONMENT_NOT_DEFINED.value : undefined,
    };
  });
};
