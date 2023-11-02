/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiFormRow,
  EuiTextColor,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
  EuiLoadingSpinner,
} from '@elastic/eui';

import * as i18n from '../translations';

const CHECKBOX_OPTIONS: EuiCheckboxGroupOption[] = [
  {
    id: DEFAULT_APP_CATEGORIES.observability.id,
    label: i18n.CREATE_FORM_CATEGORY_OBSERVABILITY_RULES,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.observability.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.security.id,
    label: i18n.CREATE_FORM_CATEGORY_SECURITY_RULES,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.security.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.management.id,
    label: i18n.CREATE_FORM_CATEGORY_STACK_RULES,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.management.id}`,
  },
];

export interface MaintenanceWindowCategorySelectionProps {
  selectedCategories: string[];
  availableCategories: string[];
  errors?: string[];
  isLoading?: boolean;
  onChange: (category: string) => void;
}

export const MaintenanceWindowCategorySelection = (
  props: MaintenanceWindowCategorySelectionProps
) => {
  const {
    selectedCategories,
    availableCategories,
    errors = [],
    isLoading = false,
    onChange,
  } = props;

  const selectedMap = useMemo(() => {
    return selectedCategories.reduce<Record<string, boolean>>((result, category) => {
      result[category] = true;
      return result;
    }, {});
  }, [selectedCategories]);

  const options: EuiCheckboxGroupOption[] = useMemo(() => {
    return CHECKBOX_OPTIONS.map((option) => ({
      ...option,
      disabled: !availableCategories.includes(option.id),
    }));
  }, [availableCategories]);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="spaceAround"
        data-test-subj="maintenanceWindowCategorySelectionLoading"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup data-test-subj="maintenanceWindowCategorySelection">
      <EuiFlexItem>
        <EuiText size="s">
          <h4>{i18n.CREATE_FORM_CATEGORY_SELECTION_TITLE}</h4>
          <p>
            <EuiTextColor color="subdued">
              {i18n.CREATE_FORM_CATEGORY_SELECTION_DESCRIPTION}
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.CREATE_FORM_CATEGORIES_SELECTION_CHECKBOX_GROUP_TITLE}
          isInvalid={!!errors.length}
          error={errors[0]}
        >
          <EuiCheckboxGroup options={options} idToSelectedMap={selectedMap} onChange={onChange} />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
