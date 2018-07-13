/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraGroupBy, InfraGroupByFilter } from '../../../../../common/graphql/types';
import { isGroupByFilters } from './type_guards';

export function getFilterLabel(group: InfraGroupBy, name: string | number): string {
  if (isGroupByFilters(group) && typeof name === 'number') {
    const filter: InfraGroupByFilter = group.filters[name];
    return filter.label || filter.query;
  }
  return String(name);
}
