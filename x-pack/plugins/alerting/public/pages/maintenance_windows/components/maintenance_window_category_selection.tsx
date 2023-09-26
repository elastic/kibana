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
  EuiTextColor,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useGetRuleTypes } from '../../../hooks/use_get_rule_types';

import * as i18n from '../translations';

const CHECKBOX_OPTIONS: EuiCheckboxGroupOption[] = [
  {
    id: DEFAULT_APP_CATEGORIES.observability.id,
    label: DEFAULT_APP_CATEGORIES.observability.label,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.observability.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.security.id,
    label: DEFAULT_APP_CATEGORIES.security.label,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.security.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.management.id,
    label: DEFAULT_APP_CATEGORIES.management.label,
    ['data-test-subj']: `checkbox-${DEFAULT_APP_CATEGORIES.management.id}`,
  },
];

const checkboxGroupLegend = {
  children: <span>{i18n.CREATE_FORM_CATEGORIES_SELECTION_CHECKBOX_GROUP_TITLE}</span>,
};

export interface MaintenanceWindowCategorySelectionProps {
  selectedCategories: string[];
  onChange: (category: string) => void;
}

export const MaintenanceWindowCategorySelection = (
  props: MaintenanceWindowCategorySelectionProps
) => {
  const { selectedCategories = [], onChange } = props;

  const { data = [], isLoading } = useGetRuleTypes();

  const selectedMap = useMemo(() => {
    return selectedCategories.reduce<Record<string, boolean>>((result, category) => {
      result[category] = true;
      return result;
    }, {});
  }, [selectedCategories]);

  const availableCategoryMap = useMemo(() => {
    return data.reduce<Record<string, boolean>>((result, ruleType) => {
      result[ruleType.category] = true;
      return result;
    }, {});
  }, [data]);

  const options: EuiCheckboxGroupOption[] = useMemo(() => {
    return CHECKBOX_OPTIONS.map((option) => ({
      ...option,
      disabled: !availableCategoryMap[option.id],
    }));
  }, [availableCategoryMap]);

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
        <EuiCheckboxGroup
          legend={checkboxGroupLegend}
          options={options}
          idToSelectedMap={selectedMap}
          onChange={onChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
