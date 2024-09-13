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
import { useGetUrlParams } from '../../../../hooks';
import { selectServiceLocationsState } from '../../../../state';

import {
  SyntheticsMonitorFilterItem,
  getSyntheticsFilterDisplayValues,
  SyntheticsMonitorFilterChangeHandler,
  LabelWithCountValue,
} from '../../../../utils/filters/filter_fields';
import { useFilters } from './use_filters';
import { FilterButton } from './filter_button';

const mixUrlValues = (
  values?: LabelWithCountValue[],
  urlLabels?: string[] | string
): LabelWithCountValue[] => {
  let urlValues: Array<{
    label: string;
    count: number;
  }> = [];
  if (typeof urlLabels === 'string' && urlLabels) {
    urlValues.push({ label: urlLabels, count: 0 });
  } else if (Array.isArray(urlLabels)) {
    urlValues = urlLabels?.map((label) => ({ label, count: 0 })) ?? [];
  }
  const newValues = [...(values ?? [])];
  // add url values that are not in the values
  urlValues.forEach((urlValue) => {
    if (!newValues.find((value) => value.label === urlValue.label)) {
      newValues.push(urlValue);
    }
  });
  return newValues;
};

export const FilterGroup = ({
  handleFilterChange,
}: {
  handleFilterChange: SyntheticsMonitorFilterChangeHandler;
}) => {
  const data = useFilters();

  const { locations } = useSelector(selectServiceLocationsState);

  const urlParams = useGetUrlParams();

  const filters: SyntheticsMonitorFilterItem[] = [
    {
      label: TYPE_LABEL,
      field: 'monitorTypes',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.monitorTypes, urlParams.monitorTypes),
        'monitorTypes',
        locations
      ),
    },
    {
      label: LOCATION_LABEL,
      field: 'locations',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(
          data?.locations.map((locationData) => {
            const matchingLocation = locations.find(
              (location) => location.id === locationData.label
            );
            return {
              label: matchingLocation ? matchingLocation.label : locationData.label,
              count: locationData.count,
            };
          }),
          urlParams.locations
        ),
        'locations',
        locations
      ),
    },
    {
      label: TAGS_LABEL,
      field: 'tags',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.tags, urlParams.tags),
        'tags',
        locations
      ),
    },
    {
      label: SCHEDULE_LABEL,
      field: 'schedules',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.schedules, urlParams.schedules),
        'schedules',
        locations
      ),
    },
  ];

  if ((data?.projects?.length || 0) > 0) {
    filters.push({
      label: PROJECT_LABEL,
      field: 'projects',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.projects, urlParams.projects),
        'projects',
        locations
      ),
    });
  }

  return (
    <EuiFilterGroup>
      {filters.map((filter, index) => (
        <FilterButton
          key={index}
          filter={filter}
          handleFilterChange={handleFilterChange}
          loading={!data}
        />
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
