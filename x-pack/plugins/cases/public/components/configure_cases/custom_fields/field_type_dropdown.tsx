/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSuperSelect, EuiSuperSelectOption, EuiFlexItem, EuiText } from '@elastic/eui';
import { CustomFieldTypesUI } from './type';

interface Props {
  customFieldTypes: CustomFieldTypesUI[],
  disabled: boolean;
  isLoading: boolean;
  onChange?: (newValue: string) => void;
  selectedType: string;
}

export const FieldTypeDropdownComponent = ({
  customFieldTypes,
  disabled,
  isLoading,
  onChange,
  selectedType
}: Props) => {
  const options: Array<EuiSuperSelectOption<CustomFieldTypesUI>> = customFieldTypes.map(
    (fieldType) => {
      return {
        value: fieldType,
        inputDisplay: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems={'center'}
            responsive={false}
            data-test-subj={`case-severity-filter-${fieldType}`}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">{fieldType}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }
  );

  return (
    <EuiSuperSelect
      disabled={disabled}
      fullWidth
      isLoading={isLoading}
      onChange={onChange}
      options={options}
      valueOfSelected={selectedType}
    />
  );
};
FieldTypeDropdownComponent.displayName = 'FieldTypeDropdown';

export const FieldTypeDropdown = React.memo(FieldTypeDropdownComponent)
