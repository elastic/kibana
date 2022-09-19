/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { FiltersContext, FiltersContextValue } from '../contexts';

/**
 * Hook to retrieve {@link FiltersContext} (contains FilterManager)
 */
export const useIndicatorFiltersContext = (): FiltersContextValue => {
  const contextValue = useContext(FiltersContext);

  if (!contextValue) {
    throw new Error('FiltersContext can only be used within IndicatorsFiltersContext provider');
  }

  return contextValue;
};
