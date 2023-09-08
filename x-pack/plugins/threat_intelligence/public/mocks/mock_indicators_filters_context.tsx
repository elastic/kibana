/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { IndicatorsFiltersContextValue } from '../modules/indicators/hooks/use_filters_context';

export const mockTimeRange = { from: '2022-10-03T07:48:31.498Z', to: '2022-10-03T07:48:31.498Z' };

export const mockIndicatorsFiltersContext: IndicatorsFiltersContextValue = {
  filterManager: {
    getFilters: () => [],
    setFilters: () => window.alert('setFilters'),
  } as unknown as FilterManager,
  filters: [],
  filterQuery: {
    language: 'kuery',
    query: '',
  },
  timeRange: mockTimeRange,
};
