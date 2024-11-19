/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';

export const formatPageFilterSearchParam = (filters: FilterControlConfig[]) => {
  return filters.map(
    ({
      title,
      fieldName,
      selectedOptions = [],
      existsSelected = false,
      exclude = false,
      hideActionBar = false,
    }) => ({
      title: title ?? fieldName,
      selectedOptions,
      fieldName,
      existsSelected,
      exclude,
      hideActionBar,
    })
  );
};
