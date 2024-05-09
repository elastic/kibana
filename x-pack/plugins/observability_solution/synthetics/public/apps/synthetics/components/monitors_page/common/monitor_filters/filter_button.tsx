/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FieldValueSelection } from '@kbn/observability-shared-plugin/public';
import {
  getSyntheticsFilterDisplayValues,
  SyntheticsMonitorFilterItem,
  valueToLabelWithEmptyCount,
} from '../../../../utils/filters/filter_fields';
import { useGetUrlParams } from '../../../../hooks';
import { useMonitorFiltersState } from './use_filters';

export const FilterButton = ({
  filter,
  handleFilterChange,
  loading,
}: {
  filter: SyntheticsMonitorFilterItem;
  handleFilterChange: ReturnType<typeof useMonitorFiltersState>['handleFilterChange'];
  loading: boolean;
}) => {
  const { label, values, field } = filter;

  const [query, setQuery] = useState('');

  const urlParams = useGetUrlParams();

  // Transform the values to readable labels (if any) so that selected values are checked on filter dropdown
  const selectedValueLabels = getSyntheticsFilterDisplayValues(
    valueToLabelWithEmptyCount(urlParams[field]),
    field,
    []
  ).map(({ label: selectedValueLabel }) => selectedValueLabel);

  return (
    <FieldValueSelection
      selectedValue={selectedValueLabels}
      singleSelection={false}
      label={label}
      values={
        query
          ? values.filter(({ label: str }) => str.toLowerCase().includes(query.toLowerCase()))
          : values
      }
      setQuery={setQuery}
      onChange={(selectedValues) => handleFilterChange(field, selectedValues)}
      allowExclusions={false}
      loading={loading}
      asFilterButton={true}
    />
  );
};
