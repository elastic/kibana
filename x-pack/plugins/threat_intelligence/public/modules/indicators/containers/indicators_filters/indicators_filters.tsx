/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, VFC } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';
import { IndicatorsFiltersContext, IndicatorsFiltersContextValue } from '../../context';

export interface IndicatorsFiltersProps {
  /**
   * Get {@link FilterManager} from the useFilters hook and save it in context to use within the indicators table.
   */
  filterManager: FilterManager;
  /**
   * Component(s) to be displayed inside
   */
  children: ReactNode;
}

/**
 * Container used to wrap components and share the {@link FilterManager} through React context.
 */
export const IndicatorsFilters: VFC<IndicatorsFiltersProps> = ({ filterManager, children }) => {
  const contextValue: IndicatorsFiltersContextValue = { filterManager };

  return (
    <IndicatorsFiltersContext.Provider value={contextValue}>
      {children}
    </IndicatorsFiltersContext.Provider>
  );
};
