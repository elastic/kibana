/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FilterValueLabel } from '../../../../../observability/public';
import { useIndexPattern } from '../../../contexts/uptime_index_pattern_context';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';

interface Props {
  onChange: (fieldName: string, values: string[]) => void;
}
export const SelectedFilters = ({ onChange }: Props) => {
  const indexPattern = useIndexPattern();
  const { selectedLocations, selectedPorts, selectedSchemes, selectedTags } = useSelectedFilters();

  const filters = [
    { field: 'observer.geo.name', label: 'Location', selected: selectedLocations },
    { field: 'url.port', label: 'Port', selected: selectedPorts },
    { field: 'monitor.type', label: 'Type', selected: selectedSchemes },
    { field: 'tags', label: 'Tag', selected: selectedTags },
  ];

  return indexPattern ? (
    <EuiFlexGroup gutterSize="xs">
      {filters.map(({ field, selected, label }) => (
        <Fragment key={field}>
          {selected.map((value) => (
            <EuiFlexItem key={field + value} grow={false}>
              <FilterValueLabel
                indexPattern={indexPattern}
                removeFilter={() => {
                  onChange(
                    field,
                    selected.filter((valT) => valT !== value)
                  );
                }}
                invertFilter={(val) => {}}
                field={field}
                value={value}
                negate={false}
                label={label}
              />
            </EuiFlexItem>
          ))}
        </Fragment>
      ))}
    </EuiFlexGroup>
  ) : null;
};
