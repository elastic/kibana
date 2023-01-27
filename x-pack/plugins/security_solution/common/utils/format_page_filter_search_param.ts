/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterItemObj } from '../../public/common/components/filter_group/types';

export const formatPageFilterSearchParam = (filters: FilterItemObj[]) => {
  return filters.map((filter) => ({
    title: filter.title ?? filter.fieldName,
    selectedOptions: filter.selectedOptions ?? [],
    fieldName: filter.fieldName,
    existsSelected: filter.existsSelected ?? false,
    exclude: filter.exclude ?? false,
  }));
};
