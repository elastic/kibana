/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { IndicatorsFlyoutContext, IndicatorsFlyoutContextValue } from './context';

/**
 * Hook to retrieve {@link IndicatorsFiltersContext} (contains FilterManager)
 */
export const useIndicatorsFlyoutContext = (): IndicatorsFlyoutContextValue => {
  const contextValue = useContext(IndicatorsFlyoutContext);

  if (!contextValue) {
    throw new Error(
      'IndicatorsFlyoutContext can only be used within IndicatorsFlyoutContext provider'
    );
  }

  return contextValue;
};
