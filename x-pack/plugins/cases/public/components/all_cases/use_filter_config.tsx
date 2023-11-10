/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { difference, differenceWith, intersectionWith, isEqual, unionWith } from 'lodash';
import { CustomFieldTypes } from '../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../custom_fields/builder';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { MultiSelectFilter } from './multi_select_filter';
import type { SystemFilterConfig } from './use_system_filter_config';

type CustomFieldFilterConfig = SystemFilterConfig;

const MoreFiltersSelectable = ({
  filterConfigOptions,
  selectedFilterConfigOptions,
  onFilterConfigChange,
}: {
  filterConfigOptions: string[];
  selectedFilterConfigOptions: string[];
  onFilterConfigChange: ({ filterId, options }: { filterId: string; options: string[] }) => void;
}) => {
  return (
    <MultiSelectFilter
      id="filters"
      buttonLabel={'more +'} // FIXME: Translation and + icon
      options={filterConfigOptions}
      selectedOptions={selectedFilterConfigOptions}
      limit={10} // FIXME: We should set a limit
      onChange={onFilterConfigChange}
      hideActiveOptionsNumber
    />
  );
};

MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';

const useCustomFieldsFilterConfig = () => {
  const [filterConfig, setFilterConfig] = useState<CustomFieldFilterConfig[]>([]); // FIXME: type

  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  useEffect(() => {
    const customFieldsFilterConfig: CustomFieldFilterConfig[] = [];
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
let loop = 0;
export const useFilterConfig = ({
  systemFilterConfig,
}: {
  systemFilterConfig: SystemFilterConfig[];
}) => {
  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig();
  const [config, setConfig] = useState(() => [...systemFilterConfig, ...customFieldsFilterConfig]);

  useEffect(() => {
    if (loop++ > 100) throw new Error('loop');
    setConfig((prevConfig) => {
      const newConfig: SystemFilterConfig[] = [];
      for (const prevFilter of prevConfig) {
        const systemFilter = systemFilterConfig.find((filter) => filter.key === prevFilter.key);
        if (systemFilter) {
          newConfig.push({
            ...systemFilter,
            isActive: prevFilter.isActive,
          });
        } else {
          newConfig.push(prevFilter);
        }
      }
      return newConfig;
    });
  }, [systemFilterConfig]);

  useEffect(() => {
    if (loop++ > 100) throw new Error('loop 2');
    setConfig((prevConfig) => {
      const newConfig = [];
      for (const prevFilter of prevConfig) {
        const customFieldsFilter = customFieldsFilterConfig.find(
          (filter) => filter.key === prevFilter.key
        );
        if (customFieldsFilter) {
          newConfig.push({
            ...customFieldsFilter,
            isActive: prevFilter.isActive,
          });
        } else {
          newConfig.push(prevFilter);
        }
      }

      for (const customFieldsFilter of customFieldsFilterConfig) {
        const prevFilter = prevConfig.find((filter) => filter.key === customFieldsFilter.key);
        if (!prevFilter) {
          newConfig.push(customFieldsFilter);
        }
      }
      console.log({ newConfig });
      return newConfig;
    });
  }, [customFieldsFilterConfig]);

  const filterConfigOptions = config
    .filter((filter) => filter.isAvailable)
    .map((filter) => filter.label);

  const selectedFilterConfigOptions = config
    .filter((filter) => filter.isAvailable && filter.isActive)
    .filter(Boolean)
    .map((filter) => filter.label);

  const onFilterConfigChange = ({ filterId, options }: { filterId: string; options: string[] }) => {
    const addedOption = difference(options, selectedFilterConfigOptions)[0];
    const removedOption = difference(selectedFilterConfigOptions, options)[0];

    let newConfig: SystemFilterConfig[] = [];
    if (addedOption) {
      const addedFilter = config.find((filter) => filter.label === addedOption);
      newConfig = config.filter((filter) => filter.label !== addedOption);
      console.log({
        addedOption: {
          ...addedFilter,
          isActive: true,
        },
      });
      newConfig.push({
        ...addedFilter,
        isActive: true,
      } as CustomFieldFilterConfig);
    } else if (removedOption) {
      newConfig = config.map((filter) => {
        if (filter.label === removedOption) {
          return {
            ...filter,
            isActive: false,
          };
        }
        return filter;
      });
    }
    console.log({ newConfig });
    setConfig(newConfig);
  };

  return {
    config,
    filterConfigOptions: filterConfigOptions.sort(),
    onFilterConfigChange,
    selectedFilterConfigOptions,
    moreFiltersSelectableComponent: MoreFiltersSelectable,
  };
};
