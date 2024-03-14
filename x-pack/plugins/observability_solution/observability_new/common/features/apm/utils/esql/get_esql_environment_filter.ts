/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifier, string } from '.';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '../../environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../es_fields/apm';

export function getEsqlEnvironmentFilter(environment: string) {
  if (environment === ENVIRONMENT_ALL.value) {
    return '';
  }
  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    return `${identifier`${SERVICE_ENVIRONMENT}`} IS NULL`;
  }

  return `${identifier`${SERVICE_ENVIRONMENT}`} == ${string`${environment}`}`;
}
