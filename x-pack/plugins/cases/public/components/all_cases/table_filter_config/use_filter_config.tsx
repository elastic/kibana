/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import type { FilterChangeHandler, FilterConfig, FilterConfigState } from './types';
import { useCustomFieldsFilterConfig } from './use_custom_fields_filter_config';
import { MoreFiltersSelectable } from './more_filters_selectable';
import { useCasesContext } from '../../cases_context/use_cases_context';

const serializeFilterVisibilityMap = (value: Map<string, FilterConfigState>) => {
  return JSON.stringify(
    Array.from(value.entries()).map(([key, filter]) => ({
      key,
      isActive: filter.isActive,
    }))
  );
};

const deserializeFilterVisibilityMap = (value: string): Map<string, FilterConfigState> => {
  return new Map(
    JSON.parse(value).map(({ key, isActive }: { key: string; isActive: boolean }) => [
      key,
      { key, isActive },
    ])
  );
};

export const useFilterConfig = ({
  systemFilterConfig,
  onFilterOptionChange,
}: {
  systemFilterConfig: FilterConfig[];
  onFilterOptionChange: FilterChangeHandler;
}) => {
  const { appId } = useCasesContext();
  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig();
  const [filters, setFilters] = useState<Map<string, FilterConfig>>(
    () => new Map([...systemFilterConfig].map((filter) => [filter.key, filter]))
  );
  const [filterVisibilityMap, setFilterVisibilityMap] = useLocalStorage<
    Map<string, FilterConfigState>
  >(`${appId}.${LOCAL_STORAGE_KEYS.casesTableFiltersConfig}`, new Map(), {
    raw: false,
    serializer: serializeFilterVisibilityMap,
    deserializer: deserializeFilterVisibilityMap,
  });

  useEffect(() => {
    const newFilters = new Map(
      [...systemFilterConfig, ...customFieldsFilterConfig]
        .filter((filter) => filter.isAvailable)
        .map((filter) => [filter.key, filter])
    );
    setFilters(newFilters);
  }, [systemFilterConfig, customFieldsFilterConfig]);

  const onChange = ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
    const newFilterVisibilityMap = new Map(filterVisibilityMap);
    const deactivatedFilters: string[] = [];

    newFilterVisibilityMap.forEach(({ key, isActive }) => {
      if (selectedOptionKeys.includes(key)) {
        if (!isActive) {
          newFilterVisibilityMap.delete(key);
          newFilterVisibilityMap.set(key, { key, isActive: true });
        }
      } else {
        deactivatedFilters.push(key);
        newFilterVisibilityMap.set(key, { key, isActive: false });
      }
    });

    filters.forEach(({ key }) => {
      if (!newFilterVisibilityMap.has(key)) {
        const isActive = selectedOptionKeys.includes(key);
        if (!isActive) {
          deactivatedFilters.push(key);
        }
        newFilterVisibilityMap.set(key, {
          key,
          isActive,
        });
      }
    });

    deactivatedFilters
      .filter((key) => filters.has(key))
      .forEach((key) => {
        (filters.get(key) as FilterConfig).deactivate({ onChange: onFilterOptionChange });
      });

    setFilterVisibilityMap(newFilterVisibilityMap);
  };

  const selectableOptions = Array.from(filters.values())
    .map(({ key, label }) => ({
      key,
      label,
    }))
    .sort((a, b) => {
      if (a.label > b.label) return 1;
      if (a.label < b.label) return -1;
      return a.key > b.key ? 1 : -1;
    });
  const source =
    filterVisibilityMap && filterVisibilityMap.size > 0 ? filterVisibilityMap : filters;
  const activeFilters = Array.from(source.values())
    .filter((filter) => filter.isActive && filters.has(filter.key))
    .map((filter) => filters.get(filter.key)) as FilterConfig[];
  const activeFilterKeys = activeFilters.map((filter) => filter.key);

  return {
    activeSelectableOptionKeys: activeFilterKeys,
    filters: activeFilters,
    moreFiltersSelectableComponent: MoreFiltersSelectable,
    onFilterConfigChange: onChange,
    selectableOptions,
  };
};
