/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';

export interface IndicatorsFiltersContextValue {
  /**
   * FilterManager is used to interact with KQL bar.
   */
  filterManager: FilterManager;
}

export const IndicatorsFiltersContext = createContext<IndicatorsFiltersContextValue | undefined>(
  undefined
);
