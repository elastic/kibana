/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterItemObj } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';

export const formatPageFilterSearchParam = (filters: FilterItemObj[]) => {
  return filters.map(
    ({ title, fieldName, selectedOptions = [], existsSelected = false, exclude = false }) => ({
      title: title ?? fieldName,
      selectedOptions,
      fieldName,
      existsSelected,
      exclude,
    })
  );
};
