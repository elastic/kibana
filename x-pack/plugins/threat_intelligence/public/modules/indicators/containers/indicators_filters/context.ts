/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { FilterManager, SavedQuery } from '@kbn/data-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';

export interface IndicatorsFiltersContextValue {
  timeRange?: TimeRange;
  filters: Filter[];
  filterQuery: Query;
  handleSavedQuery: (savedQuery: SavedQuery | undefined) => void;
  handleSubmitTimeRange: (timeRange?: TimeRange) => void;
  handleSubmitQuery: (filterQuery: Query) => void;
  filterManager: FilterManager;
  savedQuery?: SavedQuery;
}

export const IndicatorsFiltersContext = createContext<IndicatorsFiltersContextValue | undefined>(
  undefined
);
