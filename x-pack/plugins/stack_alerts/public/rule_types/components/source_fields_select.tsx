/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';

interface SourceFieldsOption {
  label: string;
}

interface SourceFieldsProps {
  esFields: FieldOption[];
  sourceFields?: string[];
  onChangeSourceFields: (selectedSourceFields: string[]) => void;
  errors: string | string[] | IErrorObject;
}

export const SourceFields: React.FC<SourceFieldsProps> = ({
  esFields,
  sourceFields,
  onChangeSourceFields,
  errors,
}) => {
  const sourceFieldsOptions = esFields.map((field) => ({ label: field.name }));
  const initialSelectedOptions = sourceFields?.map((field) => ({ label: field }));
  const [selectedSourceFields, setSelectedSourceFields] = useState<SourceFieldsOption[]>(
    initialSelectedOptions || []
  );

  return (
    <EuiFormRow
      fullWidth
      isInvalid={errors.length > 0 && sourceFields !== undefined}
      error={errors}
    >
      <EuiComboBox
        fullWidth
        placeholder="Select fields to save"
        data-test-subj="sourceFields"
        isInvalid={errors.length > 0 && sourceFields !== undefined}
        selectedOptions={selectedSourceFields}
        onChange={(selectedOptions: Array<EuiComboBoxOptionOption<SourceFieldsOption>>) => {
          setSelectedSourceFields(selectedOptions);
          const fields = selectedOptions.map((field) => field.label);
          onChangeSourceFields(fields);
        }}
        options={sourceFieldsOptions}
      />
    </EuiFormRow>
  );
};
