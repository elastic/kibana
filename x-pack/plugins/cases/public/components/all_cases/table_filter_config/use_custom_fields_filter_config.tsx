/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CustomFieldTypes } from '../../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../../custom_fields/builder';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import type { FilterChangeHandler, FilterConfig, FilterConfigRenderParams } from './types';
import { MultiSelectFilter } from '../multi_select_filter';

export const CUSTOM_FIELD_KEY_PREFIX = 'cf_';

interface CustomFieldFilterOptionFactoryProps {
  buttonLabel: string;
  customFieldOptions: Array<{ key: string; label: string }>;
  fieldKey: string;
  onFilterOptionsChange: FilterChangeHandler;
  type: CustomFieldTypes;
}
const customFieldFilterOptionFactory = ({
  buttonLabel,
  customFieldOptions,
  fieldKey,
  onFilterOptionsChange,
  type,
}: CustomFieldFilterOptionFactoryProps) => {
  return {
    key: `${CUSTOM_FIELD_KEY_PREFIX}${fieldKey}`, // this prefix is set in case custom field has the same key as a system field
    isActive: false,
    isAvailable: true,
    label: buttonLabel,
    getEmptyOptions: () => {
      return {
        customFields: {
          [fieldKey]: {
            type,
            options: [],
          },
        },
      };
    },
    render: ({ filterOptions }: FilterConfigRenderParams) => {
      const onCustomFieldChange = ({
        filterId,
        selectedOptionKeys,
      }: {
        filterId: string;
        selectedOptionKeys: string[];
      }) => {
        onFilterOptionsChange({
          customFields: {
            [filterId.replace(CUSTOM_FIELD_KEY_PREFIX, '')]: {
              options: selectedOptionKeys,
              type,
            },
          },
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
  isSelectorView,
  onFilterOptionsChange,
}: {
  isSelectorView: boolean;
  onFilterOptionsChange: FilterChangeHandler;
}) => {
  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  const customFieldsFilterConfig: FilterConfig[] = [];

  if (isSelectorView) {
    return { customFieldsFilterConfig: [] };
  }

  for (const { key: fieldKey, type, label: buttonLabel } of customFields ?? []) {
    if (customFieldsBuilder[type]) {
      const { filterOptions: customFieldOptions } = customFieldsBuilder[type]();

      if (customFieldOptions) {
        customFieldsFilterConfig.push(
          customFieldFilterOptionFactory({
            buttonLabel,
            customFieldOptions,
            fieldKey,
            onFilterOptionsChange,
            type,
          })
        );
      }
    }
  }

  return { customFieldsFilterConfig };
};
