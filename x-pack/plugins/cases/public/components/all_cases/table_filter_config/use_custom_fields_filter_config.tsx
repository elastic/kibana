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
import type { FilterChangeHandler, FilterConfig, FilterConfigRenderParams } from './types';
import { MultiSelectFilter } from '../multi_select_filter';

export const CUSTOM_FIELD_KEY_PREFIX = 'cf_';

interface CustomFieldFilterOptionFactoryProps {
  fieldKey: string;
  buttonLabel: string;
  type: CustomFieldTypes;
  onFilterOptionChange: FilterChangeHandler;
  customFieldOptions: Array<{ key: string; label: string }>;
}
const customFieldFilterOptionFactory = ({
  fieldKey,
  buttonLabel,
  type,
  onFilterOptionChange,
  customFieldOptions,
}: CustomFieldFilterOptionFactoryProps) => {
  return {
    key: `${CUSTOM_FIELD_KEY_PREFIX}${fieldKey}`, // this prefix is set in case custom field has the same key as a system field
    isActive: false,
    isAvailable: type === CustomFieldTypes.TOGGLE,
    label: buttonLabel,
    deactivate: () => {
      onFilterOptionChange({
        filterId: fieldKey,
        selectedOptionKeys: [],
        customFieldType: type,
      });
    },
    render: ({ filterOptions, onChange }: FilterConfigRenderParams) => {
      const onCustomFieldChange = ({
        filterId,
        selectedOptionKeys,
      }: {
        filterId: string;
        selectedOptionKeys: string[];
      }) => {
        onChange({
          filterId: filterId.replace(CUSTOM_FIELD_KEY_PREFIX, ''),
          selectedOptionKeys,
          customFieldType: type,
        });
      };

      return (
        <MultiSelectFilter
          buttonLabel={buttonLabel}
          id={fieldKey}
          onChange={onCustomFieldChange}
          options={customFieldOptions.map((option) => ({
            key: option.key,
            label: option.label,
          }))}
          selectedOptionKeys={filterOptions.customFields[fieldKey]?.options || []}
        />
      );
    },
  };
};

export const useCustomFieldsFilterConfig = ({
  onFilterOptionChange,
}: {
  onFilterOptionChange: FilterChangeHandler;
}) => {
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);

  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  useEffect(() => {
    const customFieldsFilterConfig: FilterConfig[] = [];
    for (const { key: fieldKey, type, label: buttonLabel } of customFields ?? []) {
      if (customFieldsBuilder[type]) {
        const { filterOptions: customFieldOptions = [] } = customFieldsBuilder[type]();

        customFieldsFilterConfig.push(
          customFieldFilterOptionFactory({
            fieldKey,
            buttonLabel,
            type,
            onFilterOptionChange,
            customFieldOptions,
          })
        );
      }
    }

    setFilterConfig(customFieldsFilterConfig);
  }, [customFields, onFilterOptionChange]);

  return { customFieldsFilterConfig: filterConfig };
};
