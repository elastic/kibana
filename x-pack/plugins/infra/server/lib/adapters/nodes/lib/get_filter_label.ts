/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isGroupByFilters } from '../../../../../common/type_guards';
import { InfraGroupBy, InfraGroupByFilter } from '../../../../../common/types';

export function getFilterLabel(group: InfraGroupBy, name: string | number): string {
  if (isGroupByFilters(group) && typeof name === 'number') {
    const filter: InfraGroupByFilter = group.filters[name];
    return filter.label || filter.query;
  }
  return String(name);
}
