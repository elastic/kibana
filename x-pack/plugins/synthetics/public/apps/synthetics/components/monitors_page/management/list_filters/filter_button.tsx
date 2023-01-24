/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FieldValueSelection } from '@kbn/observability-plugin/public';
import { getSyntheticsFilterKeyForLabel, SyntheticsFilterItem } from './filter_labels';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';

export const FilterButton = ({ filter }: { filter: SyntheticsFilterItem }) => {
  const { label, values, field } = filter;

  const [query, setQuery] = useState('');

  const [, updateUrlParams] = useUrlParams();

  const urlParams = useGetUrlParams();

  return (
    <FieldValueSelection
      selectedValue={urlParams[field] || []}
      singleSelection={false}
      label={label}
      values={
        query
          ? values.filter(({ label: str }) => str.toLowerCase().includes(query.toLowerCase()))
          : values
      }
      setQuery={setQuery}
      onChange={(selectedValues) => {
        updateUrlParams({
          [field]:
            selectedValues && selectedValues.length > 0
              ? JSON.stringify(
                  selectedValues.map((value) => getSyntheticsFilterKeyForLabel(value, field))
                )
              : undefined,
        });
      }}
      allowExclusions={false}
      loading={false}
      asFilterButton={true}
    />
  );
};
