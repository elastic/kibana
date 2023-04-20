/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../es_fields/apm';

export const getGroupByTerms = (groupBy: string[] | undefined) => {
  return (groupBy ?? []).map((group) => {
    return {
      field: group,
      missing:
        group === SERVICE_ENVIRONMENT
          ? ENVIRONMENT_NOT_DEFINED.value
          : group.replaceAll('.', '_').toUpperCase().concat('_NOT_DEFINED'),
    };
  });
};
