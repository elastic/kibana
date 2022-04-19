/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n-react';

import { getDisplayValueFromFilter } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { FilterItem } from '@kbn/unified-search-plugin/public';
import { useTriggersAndActionsUiDeps } from '../es_query/util';

interface FiltersListProps {
  dataView: DataView;
  filters: Filter[];
  onUpdateFilters: (filters: Filter[]) => void;
}

const FilterItemComponent = injectI18n(FilterItem);

export const FiltersList = ({ filters, dataView, onUpdateFilters }: FiltersListProps) => {
  const { uiSettings } = useTriggersAndActionsUiDeps();
  const dataViews = useMemo(() => [dataView], [dataView]);

  const onUpdate = (newFilter: Filter, index: number) => {
    const newFilters = [...filters];
    newFilters[index] = newFilter;
    onUpdateFilters(newFilters);
  };

  const onRemove = (index: number) => {
    onUpdateFilters(filters.filter((_, currentIndex) => currentIndex !== index));
  };

  const filterList = filters.map((filter, index) => {
    const filterValue = getDisplayValueFromFilter(filter, dataViews);
    return (
      <EuiFlexItem grow={false} className="globalFilterBar__flexItem">
        <FilterItemComponent
          key={`${filter.meta.key}${filterValue}`}
          id={`${index}`}
          filter={filter}
          onUpdate={(newFilter) => onUpdate(newFilter, index)}
          onRemove={() => onRemove(index)}
          indexPatterns={dataViews}
          uiSettings={uiSettings!}
          editOnly
        />
      </EuiFlexItem>
    );
  });

  return (
    <EuiFlexGroup
      className="globalFilterBar"
      wrap={true}
      responsive={false}
      gutterSize="xs"
      alignItems="center"
      tabIndex={-1}
    >
      {filterList}
    </EuiFlexGroup>
  );
};
