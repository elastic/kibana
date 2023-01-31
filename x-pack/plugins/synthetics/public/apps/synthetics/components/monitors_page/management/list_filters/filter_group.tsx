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
import { SyntheticsFilterItem, getSyntheticsFilterDisplayValues } from './filter_fields';

export const findLocationItem = (query: string, locations: ServiceLocations) => {
  return locations.find(({ id, label }) => query === id || label === query);
};

export const FilterGroup = () => {
  const data = useFilters();

  const { locations } = useSelector(selectServiceLocationsState);

  const filters: SyntheticsFilterItem[] = [
    {
      label: TYPE_LABEL,
      field: 'monitorTypes',
      values: getSyntheticsFilterDisplayValues(data.monitorTypes, 'monitorTypes', locations),
    },
    {
      label: LOCATION_LABEL,
      field: 'locations',
      values: getSyntheticsFilterDisplayValues(data.locations, 'locations', locations),
    },
    {
      label: TAGS_LABEL,
      field: 'tags',
      values: getSyntheticsFilterDisplayValues(data.tags, 'tags', locations),
    },
    {
      label: SCHEDULE_LABEL,
      field: 'schedules',
      values: getSyntheticsFilterDisplayValues(data.schedules, 'schedules', locations),
    },
  ];

  if (data.projects.length > 0) {
    filters.push({
      label: PROJECT_LABEL,
      field: 'projects',
      values: getSyntheticsFilterDisplayValues(data.projects, 'projects', locations),
    });
  }

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

const PROJECT_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.projectLabel', {
  defaultMessage: `Project`,
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.locationLabel', {
  defaultMessage: `Location`,
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.tagsLabel', {
  defaultMessage: `Tags`,
});

const SCHEDULE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.frequencyLabel', {
  defaultMessage: `Frequency`,
});
