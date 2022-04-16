/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getDisplayValueFromFilter } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { FilterItem } from '@kbn/unified-search-plugin/public';

const FilterItemComponent = injectI18n(FilterItem);

interface ReadOnlyFilterItemsProps {
  filters: Filter[];
  indexPatterns: DataView[];
}

const noOp = () => {};

export const ReadOnlyFilterItems = ({ filters, indexPatterns }: ReadOnlyFilterItemsProps) => {
  const { uiSettings } = useKibana().services;

  const filterList = filters.map((filter, index) => {
    const filterValue = getDisplayValueFromFilter(filter, indexPatterns);
    return (
      <EuiFlexItem grow={false} className="globalFilterBar__flexItem">
        <FilterItemComponent
          key={`${filter.meta.key}${filterValue}`}
          id={`${index}`}
          filter={filter}
          onUpdate={noOp}
          onRemove={noOp}
          indexPatterns={indexPatterns}
          uiSettings={uiSettings!}
          readonly
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
