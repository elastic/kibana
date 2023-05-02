/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedFilter, type Filter, isCombinedFilter } from '@kbn/es-query';

/**
 * Defines a boolean relation type (AND/OR) from the filter otherwise returns undefined.
 * @param {Filter} filter
 */
export const getBooleanRelationType = (filter: Filter | CombinedFilter) => {
  if (isCombinedFilter(filter)) {
    return filter.meta.relation;
  }
};
