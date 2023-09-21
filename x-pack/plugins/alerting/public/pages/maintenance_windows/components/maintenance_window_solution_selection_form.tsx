/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiText, EuiFlexItem, EuiTextColor, EuiCheckboxGroup } from '@elastic/eui';

import * as i18n from '../translations';

const CHECKBOX_OPTIONS = [
  {
    id: 'kibana',
    label: 'Kibana',
  },
  {
    id: 'observability',
    label: 'Observability',
  },
  {
    id: 'securitySolution',
    label: 'Security',
  },
  {
    id: 'management',
    label: 'Management',
  },
];

const checkboxGroupLegend = {
  children: <span>{i18n.CREATE_FORM_SOLUTION_SELECTION_CHECKBOX_GROUP_TITLE}</span>
}

export interface MaintenanceWindowSolutionSelectionFormProps {
  selectedCategories: string[]
  onChange: (category: string) => void;
}

export const MaintenanceWindowSolutionSelectionForm = (
  props: MaintenanceWindowSolutionSelectionFormProps
) => {
  const { selectedCategories = [], onChange } = props;

  const selectedMap = useMemo(() => {
    return selectedCategories.reduce<Record<string, boolean>>((result, category) => {
      result[category] = true;
      return result;
    }, {});
  }, [selectedCategories]);

  return (
    <EuiFlexGroup >
      <EuiFlexItem>
        <EuiText size="s">
          <h4>
            {i18n.CREATE_FORM_SOLUTION_SELECTION_TITLE}
          </h4>
          <p>
            <EuiTextColor color="subdued">
              {i18n.CREATE_FORM_SOLUTION_SELECTION_DESCRIPTION}
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCheckboxGroup
          legend={checkboxGroupLegend}
          options={CHECKBOX_OPTIONS}
          idToSelectedMap={selectedMap}
          onChange={onChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
