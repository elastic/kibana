/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useEditTransformFlyout, TRANSFORM_HOOK } from './use_edit_transform_flyout';

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface EditTransformFlyoutFormTextInputProps {
  dataTestSubj: string;
  errorMessages: string[];
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export const EditTransformFlyoutFormTextInput: FC<EditTransformFlyoutFormTextInputProps> = ({
  dataTestSubj,
  errorMessages,
  helpText,
  label,
  onChange,
  placeholder,
  value,
}) => {
  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={errorMessages.length > 0}
      error={errorMessages}
    >
      <EuiFieldText
        data-test-subj={dataTestSubj}
        placeholder={placeholder}
        isInvalid={errorMessages.length > 0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </EuiFormRow>
  );
};

interface EditTransformFlyoutFormTextInputHelperProps {
  field: Extract<
    keyof typeof TRANSFORM_HOOK,
    'description' | 'frequency' | 'retentionPolicyField' | 'retentionPolicyMaxAge'
  >;
  label: string;
  helpText?: string;
  placeHolder?: boolean;
}

export const EditTransformFlyoutFormTextInputHelper: FC<
  EditTransformFlyoutFormTextInputHelperProps
> = ({ field, label, helpText, placeHolder = false }) => {
  const { defaultValue, errorMessages, value } = useEditTransformFlyout(TRANSFORM_HOOK[field]);
  const { formField } = useEditTransformFlyout(TRANSFORM_HOOK.actions);
  const upperCaseField = capitalizeFirstLetter(field);

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj={`transformEditFlyout${upperCaseField}Input`}
      errorMessages={errorMessages}
      helpText={
        helpText
          ? i18n.translate(
              `xpack.transform.transformList.editFlyoutForm${upperCaseField}HelpText`,
              {
                defaultMessage: helpText,
              }
            )
          : undefined
      }
      label={i18n.translate(`xpack.transform.transformList.editFlyoutForm${upperCaseField}Label`, {
        defaultMessage: label,
      })}
      onChange={(valueUpdate) => formField({ field, value: valueUpdate })}
      value={value}
      placeholder={
        placeHolder
          ? i18n.translate(`xpack.transform.transformList.editFlyoutFormPlaceholderText`, {
              defaultMessage: 'Default: {defaultValue}',
              values: { defaultValue },
            })
          : undefined
      }
    />
  );
};
