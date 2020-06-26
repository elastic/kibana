/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { overviewFiltersSelector } from '../../../../state/selectors';
import { useSelectedFilters } from '../../../../hooks/use_selected_filters';

export interface FilterExpressionsSelectProps {
  newFilters: string[];
  onRemoveFilter: (val: string) => void;
}

export const FiltersExpressionSelectContainer: React.FC<FilterExpressionsSelectProps> = (props) => {
  const [selectedFilters, updateSelectedFilters] = useSelectedFilters();

  const overviewFilters = useSelector(overviewFiltersSelector);

  return (
    <FiltersExpressionsSelect
      {...overviewFilters}
      {...props}
      selectedFilters={selectedFilters}
      setUpdatedFieldValues={updateSelectedFilters}
    />
  );
};
