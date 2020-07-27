/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';

export function getEnvironmentUiFilterES(environment?: string): ESFilter[] {
  if (!environment) {
    return [];
  }
  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return [{ bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } }];
  }
  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
}
