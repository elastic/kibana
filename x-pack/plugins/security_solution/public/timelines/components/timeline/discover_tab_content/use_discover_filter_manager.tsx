/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { useEffect, useState } from 'react';

export const useDiscoverFilterManager = (filterManager: FilterManager | undefined) => {
  const [filters, setFilters] = useState<Filter[]>([]);

  useEffect(() => {
    const filterSub = filterManager?.getUpdates$().subscribe({
      next: () => {
        setFilters(filterManager.getFilters());
      },
    });

    return () => filterSub?.unsubscribe();
  }, [filterManager]);

  return { filters };
};
