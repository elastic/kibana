/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import { useFormField } from '../state_management/selectors/form_field';
import type { FormFields } from '../state_management/form_field';
import { capitalizeFirstLetter } from '../utils/capitalize_first_letter';

interface EditTransformFlyoutFormTextInputProps {
  field: FormFields;
  label: string;
  helpText?: string;
  placeHolder?: boolean;
}

export const EditTransformFlyoutFormTextInput: FC<EditTransformFlyoutFormTextInputProps> = ({
  field,
  label,
  helpText,
  placeHolder = false,
}) => {
  const { defaultValue, errorMessages, value } = useFormField(field);
  const { setFormField } = useEditTransformFlyoutActions();
  const upperCaseField = capitalizeFirstLetter(field);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={errorMessages.length > 0}
      error={errorMessages}
    >
      <EuiFieldText
        data-test-subj={`transformEditFlyout${upperCaseField}Input`}
        placeholder={
          placeHolder
            ? i18n.translate('xpack.transform.transformList.editFlyoutFormPlaceholderText', {
                defaultMessage: 'Default: {defaultValue}',
                values: { defaultValue },
              })
            : undefined
        }
        isInvalid={errorMessages.length > 0}
        value={value}
        onChange={(e) => setFormField({ field, value: e.target.value })}
        aria-label={label}
      />
    </EuiFormRow>
  );
};
