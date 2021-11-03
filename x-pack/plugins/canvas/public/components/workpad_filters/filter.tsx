/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedFilterViewInstance, Filter as FilterType } from '../../../types';
import { useCanvasFilters, useCanvasFiltersActions } from '../hooks/sidebar';
import { Filter as Component } from './filter.component';

interface Props {
  filterView: FormattedFilterViewInstance;
  filter: FilterType;
}

const StaticFilter: FC<Props> = (props) => <Component {...props} />;

const InteractiveFilter: FC<Props> = (props) => {
  const filters = useCanvasFilters();
  const { updateFilter } = useCanvasFiltersActions();

  return <Component {...props} updateFilter={updateFilter} availableFilters={filters} />;
};

export const Filter: FC<Props> = (props) => {
  const { filterView } = props;

  const isInteractive = Object.values(filterView).filter(({ component }) => component);
  if (isInteractive) {
    return <InteractiveFilter {...props} />;
  }

  return <StaticFilter {...props} />;
};
