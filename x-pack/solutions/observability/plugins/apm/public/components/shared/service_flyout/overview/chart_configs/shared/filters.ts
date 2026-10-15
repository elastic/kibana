/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../../common/environment_filter_values';
import type { ServiceScope } from './types';

export function applyServiceFilters(query: ComposerQuery, scope: ServiceScope): void {
  const { serviceName, environment } = scope;
  query.where`${esql.col(SERVICE_NAME)} == ${serviceName}`;
  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${ENVIRONMENT_NOT_DEFINED.value} OR ${esql.col(
      SERVICE_ENVIRONMENT
    )} IS NULL`;
  } else if (environment !== ENVIRONMENT_ALL.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }
}
