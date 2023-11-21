/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../../custom_fields/builder';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import type { FilterConfig } from './types';
import { MultiSelectFilter, mapToMultiSelectOption } from '../multi_select_filter';

export const useCustomFieldsFilterConfig = () => {
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
                selectedOptionKeys={filterOptions.customFields[key]}
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
