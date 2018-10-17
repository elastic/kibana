/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraPathInput, InfraPathType } from '../../../../../common/graphql/types';
import { InfraGroupByFilters, InfraGroupByTerms } from '../adapter_types';

export function isGroupByFilters(value: InfraPathInput): value is InfraGroupByFilters {
  return value.type === InfraPathType.filters;
}

export function isGroupByTerms(value: InfraPathInput): value is InfraGroupByTerms {
  return value.type === InfraPathType.terms;
}
