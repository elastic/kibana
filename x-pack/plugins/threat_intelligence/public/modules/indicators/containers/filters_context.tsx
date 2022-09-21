/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, VFC } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';
import { FiltersContext, FiltersContextValue } from '../contexts';

export interface FiltersContextProviderProps {
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
export const FiltersContextProvider: VFC<FiltersContextProviderProps> = ({
  filterManager,
  children,
}) => {
  const contextValue: FiltersContextValue = { filterManager };

  return <FiltersContext.Provider value={contextValue}>{children}</FiltersContext.Provider>;
};
