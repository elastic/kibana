/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { useKibana, useSecurityContext } from '../../../../hooks';
import { IndicatorsFiltersContext, IndicatorsFiltersContextValue } from '.';

/**
 * Container used to wrap components and share the {@link FilterManager} through React context.
 */
export const IndicatorsFilters: FC = ({ children }) => {
  const securityContext = useSecurityContext();

  const {
    services: {
      data: {
        query: { filterManager },
      },
    },
  } = useKibana();

  const globalFilters = securityContext.useFilters();
  const globalQuery = securityContext.useQuery();
  const globalTimeRange = securityContext.useGlobalTime();

  const contextValue: IndicatorsFiltersContextValue = useMemo(
    () => ({
      timeRange: globalTimeRange,
      filters: globalFilters,
      filterQuery: globalQuery,
      filterManager,
    }),
    [globalFilters, globalQuery, globalTimeRange, filterManager]
  );

  return (
    <IndicatorsFiltersContext.Provider value={contextValue}>
      {children}
    </IndicatorsFiltersContext.Provider>
  );
};
