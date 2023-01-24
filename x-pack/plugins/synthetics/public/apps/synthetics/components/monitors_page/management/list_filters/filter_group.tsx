/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { ServiceLocations } from '../../../../../../../common/runtime_types';
import { useFilters } from './use_filters';
import { FilterButton } from './filter_button';
import { selectServiceLocationsState } from '../../../../state';

export interface FilterItem {
  label: string;
  values: Array<{ label: string; count: number }>;
  field: 'tags' | 'status' | 'locations' | 'monitorType';
}

export const findLocationItem = (query: string, locations: ServiceLocations) => {
  return locations.find(({ id, label }) => query === id || label === query);
};

export const FilterGroup = () => {
  const data = useFilters();

  const { locations } = useSelector(selectServiceLocationsState);

  const filters: FilterItem[] = [
    {
      label: TYPE_LABEL,
      field: 'monitorType',
      values: data.types,
    },
    {
      label: LOCATION_LABEL,
      field: 'locations',
      values: data.locations.map(({ label, count }) => ({
        label: findLocationItem(label, locations)?.label ?? label,
        count,
      })),
    },
    {
      label: TAGS_LABEL,
      field: 'tags',
      values: data.tags,
    },
  ];

  return (
    <EuiFilterGroup>
      {filters.map((filter, index) => (
        <FilterButton key={index} filter={filter} />
      ))}
    </EuiFilterGroup>
  );
};

const TYPE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.typeLabel', {
  defaultMessage: `Type`,
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.locationLabel', {
  defaultMessage: `Location`,
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.tagsLabel', {
  defaultMessage: `Tags`,
});
