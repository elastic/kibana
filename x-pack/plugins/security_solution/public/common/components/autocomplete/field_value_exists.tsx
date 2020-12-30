/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';

interface AutocompleteFieldExistsProps {
  placeholder: string;
  rowLabel?: string;
}

export const AutocompleteFieldExistsComponent: React.FC<AutocompleteFieldExistsProps> = ({
  placeholder,
  rowLabel,
}): JSX.Element => (
  <EuiFormRow label={rowLabel} fullWidth>
    <EuiComboBox
      placeholder={placeholder}
      options={[]}
      selectedOptions={[]}
      onChange={undefined}
      isDisabled
      data-test-subj="valuesAutocompleteComboBox existsComboxBox"
      fullWidth
    />
  </EuiFormRow>
);

AutocompleteFieldExistsComponent.displayName = 'AutocompleteFieldExists';
