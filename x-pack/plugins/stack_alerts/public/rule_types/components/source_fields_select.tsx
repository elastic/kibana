/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { validSourceFields } from '../../../common/constants';

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
  const sourceFieldsOptions = esFields.flatMap((field) => {
    return validSourceFields.includes(field.name) ? [{ label: field.name }] : [];
  });
  const initialSelectedOptions = sourceFields?.map((field) => ({ label: field }));
  const [selectedSourceFields, setSelectedSourceFields] = useState<SourceFieldsOption[]>(
    initialSelectedOptions || []
  );

  return sourceFieldsOptions.length > 0 ? (
    <EuiFormRow
      fullWidth
      isInvalid={errors.length > 0 && sourceFields !== undefined}
      error={errors}
    >
      <>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.stackAlerts.components.ui.sourceFieldsSelect.title"
              defaultMessage="Select fields to copy into alerts "
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiComboBox
          fullWidth
          placeholder={i18n.translate(
            'xpack.stackAlerts.components.ui.sourceFieldsSelect.placeholder',
            {
              defaultMessage: 'Select fields',
            }
          )}
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
      </>
    </EuiFormRow>
  ) : null;
};
