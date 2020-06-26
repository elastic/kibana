/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FilterGroupComponent } from './index';
import { useOverviewFilters } from '../../../hooks/use_overview_filters';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';

export const FilterGroup: React.FC = () => {
  const { filters, loading } = useOverviewFilters();
  const [selectedFilters, updateSelectedFilters] = useSelectedFilters();

  return (
    <FilterGroupComponent
      overviewFilters={filters}
      loading={loading}
      selectedFilters={selectedFilters}
      updateSelectedFilters={updateSelectedFilters}
    />
  );
};
