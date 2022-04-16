/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FilterValueLabel } from '@kbn/observability-plugin/public';
import { useIndexPattern } from '../../../contexts/uptime_index_pattern_context';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';

interface Props {
  onChange: (fieldName: string, values: string[], notValues: string[]) => void;
}
export const SelectedFilters = ({ onChange }: Props) => {
  const indexPattern = useIndexPattern();
  const { filtersList } = useSelectedFilters();

  if (!indexPattern) return null;

  return (
    <EuiFlexGroup gutterSize="xs" wrap>
      {filtersList.map(({ field, selectedItems, excludedItems, label }) => [
        ...selectedItems.map((value) => (
          <EuiFlexItem key={field + value} grow={false}>
            <FilterValueLabel
              dataView={indexPattern}
              removeFilter={() => {
                onChange(
                  field,
                  selectedItems.filter((valT) => valT !== value),
                  excludedItems
                );
              }}
              invertFilter={(val) => {
                onChange(
                  field,
                  selectedItems.filter((valT) => valT !== value),
                  [...excludedItems, value]
                );
              }}
              field={field}
              value={value}
              negate={false}
              label={label}
            />
          </EuiFlexItem>
        )),
        ...excludedItems.map((value) => (
          <EuiFlexItem key={field + value} grow={false}>
            <FilterValueLabel
              dataView={indexPattern}
              removeFilter={() => {
                onChange(
                  field,
                  selectedItems,
                  excludedItems.filter((valT) => valT !== value)
                );
              }}
              invertFilter={(val) => {
                onChange(
                  field,
                  [...selectedItems, value],
                  excludedItems.filter((valT) => valT !== value)
                );
              }}
              field={field}
              value={value}
              negate={true}
              label={label}
            />
          </EuiFlexItem>
        )),
      ])}
    </EuiFlexGroup>
  );
};
