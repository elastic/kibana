/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { merge } from 'lodash';
import type { FilterOptions } from '../../../../common/ui';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import type { FilterConfig, FilterConfigState } from './types';
import { useCustomFieldsFilterConfig } from './use_custom_fields_filter_config';
import { useCasesContext } from '../../cases_context/use_cases_context';

const mergeSystemAndCustomFieldConfigs = ({
  systemFilterConfig,
  customFieldsFilterConfig,
}: {
  systemFilterConfig: FilterConfig[];
  customFieldsFilterConfig: FilterConfig[];
}) => {
  const newFilterConfig = new Map(
    [...systemFilterConfig, ...customFieldsFilterConfig]
      .filter((filter) => filter.isAvailable)
      .map((filter) => [filter.key, filter])
  );

  return newFilterConfig;
};

export const useFilterConfig = ({
  isSelectorView,
  onFilterOptionsChange,
  systemFilterConfig,
}: {
  isSelectorView: boolean;
  onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
  systemFilterConfig: FilterConfig[];
}) => {
  const { appId } = useCasesContext();
  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig({
    isSelectorView,
    onFilterOptionsChange,
  });
  const [filterConfigs, setFilterConfigs] = useState<Map<string, FilterConfig>>(
    () => new Map([...systemFilterConfig].map((filter) => [filter.key, filter]))
  );
  /**
   * Initially we won't save any order, it will use the default config as it is defined in the system.
   * Once the user adds/removes a filter, we start saving the order and the visible state.
   */
  const [activeByFilterKey, setActiveByFilterKey] = useLocalStorage<FilterConfigState[]>(
    `${appId}.${LOCAL_STORAGE_KEYS.casesTableFiltersConfig}`,
    []
  );

  /**
   * This effect is needed in case a filter (mostly custom field) is removed from the settings
   * but the user was filtering by it.
   */
  useEffect(() => {
    const newFilterConfig = mergeSystemAndCustomFieldConfigs({
      systemFilterConfig,
      customFieldsFilterConfig,
    });

    const emptyOptions: Array<Partial<FilterOptions>> = [];
    filterConfigs.forEach((filter) => {
      if (!newFilterConfig.has(filter.key)) {
        emptyOptions.push(filter.getEmptyOptions());
      }
    });

    if (emptyOptions.length > 0) {
      const mergedEmptyOptions = merge({}, ...emptyOptions);
      onFilterOptionsChange(mergedEmptyOptions);
    }
  }, [filterConfigs, systemFilterConfig, customFieldsFilterConfig, onFilterOptionsChange]);

  /**
   * As custom fields are loaded by fetching an API and they might also be removed
   * while using the app, we merge the system and custom fields configs on every time
   * they change.
   */
  useEffect(() => {
    setFilterConfigs(
      mergeSystemAndCustomFieldConfigs({
        systemFilterConfig,
        customFieldsFilterConfig,
      })
    );
  }, [systemFilterConfig, customFieldsFilterConfig]);

  const onChange = ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
    const newActiveByFilterKey = [...(activeByFilterKey || [])];
    const deactivatedFilters: string[] = [];

    // for each filter in the current state, this way we keep the order
    (activeByFilterKey || []).forEach(({ key, isActive: prevIsActive }) => {
      const currentIndex = newActiveByFilterKey.findIndex((filter) => filter.key === key);
      if (filterConfigs.has(key)) {
        const isActive = selectedOptionKeys.find((optionKey) => optionKey === key);
        if (isActive && !prevIsActive) {
          // remove/insert to the end with isActive = true
          newActiveByFilterKey.splice(currentIndex, 1);
          newActiveByFilterKey.push({ key, isActive: true });
        } else if (!isActive && prevIsActive) {
          // dont move, just update isActive = false
          deactivatedFilters.push(key);
          newActiveByFilterKey[currentIndex] = { key, isActive: false };
        }
      } else {
        // we might have in local storage a key of a field that don't exist anymore
        newActiveByFilterKey.splice(currentIndex, 1);
      }
    });

    // for each filter in the config
    filterConfigs.forEach(({ key: configKey }) => {
      // add it if its a new filter
      if (!newActiveByFilterKey.find(({ key }) => key === configKey)) {
        // first time, the current state is empty, all filters will be added
        // isActive = true if the filter is in the selectedOptionKeys
        const isActive = selectedOptionKeys.find((optionKey) => optionKey === configKey);
        if (!isActive) {
          // for system filter that is removed as first action
          deactivatedFilters.push(configKey);
        }
        newActiveByFilterKey.push({
          key: configKey,
          isActive: Boolean(isActive),
        });
      }
    });

    const emptyOptions = deactivatedFilters
      .filter((key) => filterConfigs.has(key))
      .map((key) => (filterConfigs.get(key) as FilterConfig).getEmptyOptions());

    if (emptyOptions.length > 0) {
      const mergedEmptyOptions = merge({}, ...emptyOptions);
      onFilterOptionsChange(mergedEmptyOptions);
    }

    setActiveByFilterKey(newActiveByFilterKey);
  };

  const filterConfigArray = Array.from(filterConfigs.values());
  const selectableOptions = filterConfigArray
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
    activeByFilterKey && activeByFilterKey.length > 0 ? activeByFilterKey : filterConfigArray;
  const activeFilters = source
    .filter((filter) => filter.isActive && filterConfigs.has(filter.key))
    .map((filter) => filterConfigs.get(filter.key)) as FilterConfig[];
  const activeFilterKeys = activeFilters.map((filter) => filter.key);

  return {
    activeSelectableOptionKeys: activeFilterKeys,
    filters: activeFilters,
    onFilterConfigChange: onChange,
    selectableOptions,
  };
};
