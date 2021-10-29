/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import React, { FC } from 'react';
import { Filter } from '../../../types';
import { useCanvasFilters } from '../hooks/sidebar/use_canvas_filters';
import { WorkpadFilters as Component } from './workpad_filters.component';

const groupFiltersBy = (filters: Filter[], groupByField: keyof Filter) => {
  const groupedFilters = groupBy(filters, (filter) => filter[groupByField]);
  return Object.keys(groupedFilters).map((key) => {
    return { name: key, filters: groupedFilters[key] };
  });
};

export const WorkpadFilters: FC = () => {
  const { filters: canvasFilters } = useCanvasFilters();
  const filtersGroups = groupFiltersBy(canvasFilters, 'type');

  return <Component filtersGroups={filtersGroups} />;
};
