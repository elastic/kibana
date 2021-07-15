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
import { MONITOR_ROUTE } from '../../common/constants';

export const useSelectedFilters = () => {
  const { filters } = useGetUrlParams();
  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return useMemo(() => {
    let selectedFilters: Map<string, string[]>;
    try {
      selectedFilters = new Map<string, string[]>(JSON.parse(filters));
    } catch {
      selectedFilters = new Map<string, string[]>();
    }

    const { TAG, SCHEME, PORT, LOCATION } = filterLabels;

    const selectedTags = selectedFilters.get('tags') || [];
    const selectedPorts = selectedFilters.get('url.port') || [];
    const selectedSchemes = selectedFilters.get('monitor.type') || [];
    const selectedLocations = selectedFilters.get('observer.geo.name') || [];

    const filtersList = [
      { field: 'observer.geo.name', label: LOCATION, selectedItems: selectedLocations },
      // on monitor page we only display location filter in ping list
      ...(!isMonitorPage
        ? [
            { field: 'url.port', label: PORT, selectedItems: selectedPorts },
            { field: 'monitor.type', label: SCHEME, selectedItems: selectedSchemes },
            { field: 'tags', label: TAG, selectedItems: selectedTags },
          ]
        : []),
    ];

    return {
      selectedTags,
      selectedPorts,
      selectedSchemes,
      selectedLocations,
      filtersList,
    };
  }, [filters, isMonitorPage]);
};
