/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraPath, InfraPathType } from '../../../../../common/graphql/types';
import { InfraGroupByFilters, InfraGroupByTerms } from '../adapter_types';

export function isGroupByFilters(value: InfraPath): value is InfraGroupByFilters {
  return value.type === InfraPathType.filters;
}

export function isGroupByTerms(value: InfraPath): value is InfraGroupByTerms {
  return value.type === InfraPathType.terms;
}
