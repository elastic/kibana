/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useGetUrlParams } from './use_url_params';
import { filterLabels } from '../components/overview/filter_group/translations';
import { FILTER_FIELDS, MONITOR_ROUTE } from '../../common/constants';
import { parseFiltersMap } from './use_filter_update';

type FilterType = string[];
interface Filters {
  locations: FilterType;
  ports: FilterType;
  schemes: FilterType;
  tags: FilterType;
}

export const getFiltersFromMap = (map?: Map<string, string[]>): Filters => {
  if (typeof map === 'undefined') {
    return {
      locations: [],
      ports: [],
      schemes: [],
      tags: [],
    };
  }

  const { LOCATION, TAGS, TYPE, PORT } = FILTER_FIELDS;

  return {
    locations: map.get(LOCATION) ?? [],
    ports: map.get(PORT) ?? [],
    schemes: map.get(TYPE) ?? [],
    tags: map.get(TAGS) ?? [],
  };
};

export const useSelectedFilters = () => {
  const { filters, excludedFilters } = useGetUrlParams();
  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return useMemo(() => {
    const selectedFilters = parseFiltersMap(filters);
    const excludedFiltersMap = parseFiltersMap(excludedFilters);

    const { TAG, SCHEME, PORT, LOCATION } = filterLabels;

    const {
      locations: selectedLocations,
      ports: selectedPorts,
      schemes: selectedSchemes,
      tags: selectedTags,
    } = getFiltersFromMap(selectedFilters);

    const {
      locations: excludedLocations,
      ports: excludedPorts,
      schemes: excludedSchemes,
      tags: excludedTags,
    } = getFiltersFromMap(excludedFiltersMap);

    const filtersList = [
      {
        field: 'observer.geo.name',
        label: LOCATION,
        selectedItems: selectedLocations,
        excludedItems: excludedLocations,
      },
      // on monitor page we only display location filter in ping list
      ...(!isMonitorPage
        ? [
            {
              field: 'url.port',
              label: PORT,
              selectedItems: selectedPorts,
              excludedItems: excludedPorts,
            },
            {
              field: 'monitor.type',
              label: SCHEME,
              selectedItems: selectedSchemes,
              excludedItems: excludedSchemes,
            },
            { field: 'tags', label: TAG, selectedItems: selectedTags, excludedItems: excludedTags },
          ]
        : []),
    ];

    return {
      excludedLocations,
      selectedTags,
      selectedPorts,
      selectedSchemes,
      selectedLocations,
      filtersList,
    };
  }, [excludedFilters, filters, isMonitorPage]);
};
