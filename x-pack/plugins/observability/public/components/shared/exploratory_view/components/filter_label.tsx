/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';
import { useSeriesFilters } from '../hooks/use_series_filters';
import { FilterValueLabel } from '../../filter_value_label/filter_value_label';

interface Props {
  field: string;
  label: string;
  value: string;
  seriesId: string;
  negate: boolean;
  definitionFilter?: boolean;
  indexPattern: IndexPattern;
  removeFilter: (field: string, value: string, notVal: boolean) => void;
}

export function FilterLabel({
  label,
  seriesId,
  field,
  value,
  negate,
  indexPattern,
  removeFilter,
  definitionFilter,
}: Props) {
  const { invertFilter } = useSeriesFilters({ seriesId });

  return indexPattern ? (
    <FilterValueLabel
      indexPattern={indexPattern}
      removeFilter={removeFilter}
      invertFilter={(val) => {
        if (!definitionFilter) invertFilter(val);
      }}
      field={field}
      value={value}
      negate={negate}
      label={label}
    />
  ) : null;
}
