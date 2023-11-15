/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { CustomFieldTypes } from '../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../custom_fields/builder';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import type { FilterConfig, FilterConfigState } from './use_system_filter_config';
import { MORE_FILTERS_LABEL } from './translations';

const MoreFiltersSelectable = ({
  options,
  activeFilters,
  onChange,
}: {
  options: Array<MultiSelectFilterOption<string>>;
  activeFilters: string[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}) => {
  return (
    <MultiSelectFilter
      buttonLabel={MORE_FILTERS_LABEL}
      buttonIconType="plus"
      hideActiveOptionsNumber
      id="filters"
      onChange={onChange}
      options={options}
      selectedOptionKeys={activeFilters}
    />
  );
};
MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';

const useCustomFieldsFilterConfig = () => {
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);

  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  useEffect(() => {
    const customFieldsFilterConfig: FilterConfig[] = [];
    for (const { key, type, label } of customFields ?? []) {
      if (customFieldsBuilder[type]) {
        const customField = customFieldsBuilder[type]();
        customFieldsFilterConfig.push({
          key,
          isActive: false,
          isAvailable: type === CustomFieldTypes.TOGGLE,
          label,
          render: ({ filterOptions, onChange }) => {
            return (
              <MultiSelectFilter
                buttonLabel={label}
                id={key}
                onChange={onChange}
                options={mapToMultiSelectOption(customField.filterOptions || [])}
                selectedOptionKeys={filterOptions[key]}
              />
            );
          },
        });
      }
    }

    setFilterConfig(customFieldsFilterConfig);
  }, [customFields]);

  return { customFieldsFilterConfig: filterConfig };
};

export const useFilterConfig = ({ systemFilterConfig }: { systemFilterConfig: FilterConfig[] }) => {
  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig();
  const [config, setConfig] = useState<Map<string, FilterConfig>>(
    () => new Map([...systemFilterConfig].map((filter) => [filter.key, filter]))
  );
  const [storedOptions, setStoredOptions] = useLocalStorage<Map<string, FilterConfigState>>(
    'filters',
    new Map(),
    {
      raw: false,
      serializer: (value) => {
        return JSON.stringify(
          Array.from(value.entries()).map(([key, filter]) => ({
            key,
            isActive: filter.isActive,
          }))
        );
      },
      deserializer: (value) => {
        return new Map(
          JSON.parse(value).map(({ key, isActive }: { key: string; isActive: boolean }) => [
            key,
            { key, isActive },
          ])
        );
      },
    }
  );

  useEffect(() => {
    const newConfig = new Map(
      [...systemFilterConfig, ...customFieldsFilterConfig]
        .filter((filter) => filter.isAvailable)
        .map((filter) => [filter.key, filter])
    );
    setConfig(newConfig);
  }, [systemFilterConfig, customFieldsFilterConfig]);

  const onChange = ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
    const _storedOptions = new Map(storedOptions);

    _storedOptions.forEach(({ key, isActive }) => {
      if (selectedOptionKeys.includes(key)) {
        if (!isActive) {
          _storedOptions.delete(key);
          _storedOptions.set(key, { key, isActive: true });
        }
      } else {
        _storedOptions.set(key, { key, isActive: false });
      }
    });

    config.forEach(({ key, isActive }) => {
      if (!_storedOptions.has(key)) {
        _storedOptions.set(key, {
          key,
          isActive: selectedOptionKeys.includes(key),
        });
      }
    });

    setStoredOptions(_storedOptions);
  };

  const availableConfigs = Array.from(config.values()).filter((filter) => filter.isAvailable);
  const selectableOptions = availableConfigs
    .map(({ key, label }) => ({
      key,
      label,
    }))
    .sort((a, b) => {
      if (a.label > b.label) return 1;
      if (a.label < b.label) return -1;
      return a.key > b.key ? 1 : -1;
    });
  const source = storedOptions && storedOptions.size > 0 ? storedOptions : config;
  const activeFilters = Array.from(source.values())
    .filter((filter) => filter.isActive && config.has(filter.key))
    .map((filter) => config.get(filter.key)) as FilterConfig[];
  const activeFilterKeys = activeFilters.map((filter) => filter.key);

  return {
    activeSelectableOptionKeys: activeFilterKeys,
    filters: activeFilters,
    moreFiltersSelectableComponent: MoreFiltersSelectable,
    onFilterConfigChange: onChange,
    selectableOptions,
  };
};
