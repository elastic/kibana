/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiSuperSelect, EuiFlexItem, EuiText } from '@elastic/eui';
import { CustomFieldTypes } from '../types';
import * as i18n from '../translations';

interface Props {
  disabled: boolean;
  isLoading: boolean;
  onChange?: (newValue: string) => void;
  selectedType: string;
}

interface CustomFieldTypeValues {
  id: CustomFieldTypes;
  label?: string;
}

export const FieldTypeDropdownComponent = ({
  disabled,
  isLoading,
  onChange,
  selectedType,
}: Props) => {
  const customFieldTypesValues: CustomFieldTypeValues[] = [
    {
      id: CustomFieldTypes.TEXT,
      label: i18n.TEXT_LABEL,
    },
    {
      id: CustomFieldTypes.TOGGLE,
      label: i18n.TOGGLE_LABEL,
    },
  ];

  const options: Array<EuiSuperSelectOption<CustomFieldTypes>> = customFieldTypesValues.map(
    (fieldType) => {
      return {
        value: fieldType.id,
        inputDisplay: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems={'center'}
            responsive={false}
            data-test-subj={`custom-field-type-${fieldType.id}`}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">{fieldType.label}</EuiText>
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
      data-test-subj="custom-field-type-dropdown"
    />
  );
};
FieldTypeDropdownComponent.displayName = 'FieldTypeDropdown';

export const FieldTypeDropdown = React.memo(FieldTypeDropdownComponent);
