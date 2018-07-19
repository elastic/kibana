/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraGroupBy, InfraGroupByType } from '../../../../../common/graphql/types';
import { InfraGroupByFilters, InfraGroupByTerms } from '../adapter_types';

export function isGroupByFilters(value: InfraGroupBy): value is InfraGroupByFilters {
  return value.type === InfraGroupByType.filters;
}

export function isGroupByTerms(value: InfraGroupBy): value is InfraGroupByTerms {
  return value.type === InfraGroupByType.terms;
}
