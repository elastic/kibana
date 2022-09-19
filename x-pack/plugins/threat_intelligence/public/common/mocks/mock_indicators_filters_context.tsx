/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { FiltersContextValue } from '../../modules/indicators/contexts';

export const mockIndicatorsFiltersContext: FiltersContextValue = {
  filterManager: {
    getFilters: () => [],
    setFilters: () => {},
  } as unknown as FilterManager,
};
