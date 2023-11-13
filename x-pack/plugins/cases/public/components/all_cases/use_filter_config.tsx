/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { CustomFieldTypes } from '../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../custom_fields/builder';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { MultiSelectFilter } from './multi_select_filter';
import type { FilterConfig } from './use_system_filter_config';

const MoreFiltersSelectable = ({
  options,
  activeFilters,
  onChange,
}: {
  options: string[];
  activeFilters: string[];
  onChange: ({ filterId, options }: { filterId: string; options: string[] }) => void;
}) => {
  return (
    <MultiSelectFilter
      id="filters"
      buttonLabel={'more +'} // FIXME: Translation and + icon
      options={options}
      selectedOptions={activeFilters}
      limit={10} // FIXME: We should set a limit
      onChange={onChange}
      hideActiveOptionsNumber
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
                options={customField.filterOptions || []}
                selectedOptions={filterOptions[key]}
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
  const [config, setConfig] = useState<Map<string, FilterConfig>>(() => {
    return new Map(
      [...systemFilterConfig, ...customFieldsFilterConfig].map((filter) => [filter.key, filter])
    );
  });

  useEffect(() => {
    setConfig((prevConfig) => {
      const _config = new Map(prevConfig);
      const updatedConfig = new Map(
        [...systemFilterConfig, ...customFieldsFilterConfig].map((filter) => [filter.key, filter])
      );

      updatedConfig.forEach((filter) => {
        if (_config.has(filter.key)) {
          const outputFilter = _config.get(filter.key);
          if (outputFilter) {
            _config.set(filter.key, { ...filter, isActive: outputFilter.isActive });
          }
        } else {
          _config.set(filter.key, filter);
        }
      });

      return _config;
    });
  }, [systemFilterConfig, customFieldsFilterConfig]);

  const onFilterConfigChange = ({
    filterId,
    options: activatedOptions,
  }: {
    filterId: string;
    options: string[];
  }) => {
    setConfig((prevConfig) => {
      const _config = new Map(prevConfig);

      prevConfig.forEach((filter) => {
        if (activatedOptions.includes(filter.label)) {
          if (!filter.isActive) {
            // new activated options are inserted at the end of the list
            _config.delete(filter.key);
            _config.set(filter.key, { ...filter, isActive: true });
          }
        } else {
          _config.set(filter.key, { ...filter, isActive: false });
        }
      });

      return _config;
    });
  };

  const configArray = Array.from(config.values()).filter((filter) => filter.isAvailable);
  const filterLabels = configArray.map((filter) => filter.label);
  const activeFilters = configArray.filter((filter) => filter.isActive).map((filter) => filter);
  const activeFilterLabels = activeFilters.map((filter) => filter.label);

  return {
    config: activeFilters,
    filterConfigOptions: filterLabels.sort(),
    onFilterConfigChange,
    activeFilters: activeFilterLabels,
    moreFiltersSelectableComponent: MoreFiltersSelectable,
  };
};
