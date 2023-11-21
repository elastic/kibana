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
import type { FilterConfig, FilterConfigRenderParams } from './types';
import { MultiSelectFilter, mapToMultiSelectOption } from '../multi_select_filter';

const getCustomFieldFilterComponent = ({
  customFieldOptions = [],
  label,
  key,
}: {
  customFieldOptions?: string[];
  label: string;
  key: string;
}) => {
  const FieldFilterComponent = ({ filterOptions, onChange }: FilterConfigRenderParams) => {
    const onCustomFieldChange = ({
      filterId,
      selectedOptionKeys,
    }: {
      filterId: string;
      selectedOptionKeys: string[];
    }) => {
      onChange({
        filterId,
        selectedOptionKeys,
        isCustomField: true,
      });
    };

    return (
      <MultiSelectFilter
        buttonLabel={label}
        id={key}
        onChange={onCustomFieldChange}
        options={mapToMultiSelectOption(customFieldOptions)}
        selectedOptionKeys={filterOptions.customFields[key]}
      />
    );
  };

  FieldFilterComponent.displayName = 'FieldFilterComponent';

  return FieldFilterComponent;
};

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
          render: getCustomFieldFilterComponent({
            customFieldOptions: customField.filterOptions,
            key,
            label,
          }),
        });
      }
    }

    setFilterConfig(customFieldsFilterConfig);
  }, [customFields]);

  return { customFieldsFilterConfig: filterConfig };
};
