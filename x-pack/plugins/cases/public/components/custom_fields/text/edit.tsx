/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, UseField, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseUI } from '../../../../common';
import type { CustomFieldType } from '../types';
import { View } from './view';
import { CANCEL, EDIT_CUSTOM_FIELDS_ARIA_LABEL, SAVE, UNKNOWN } from '../translations';

interface FormState {
  isValid: boolean | undefined;
  submit: FormHook<{ value: string }>['submit'];
}

interface FormWrapper {
  initialValue: string;
  isLoading: boolean;
  customFieldKey: string;
  onChange: (state: FormState) => void;
}

const FormWrapperComponent: React.FC<FormWrapper> = ({
  initialValue,
  isLoading,
  customFieldKey,
  onChange,
}) => {
  const { form } = useForm({
    defaultValue: { value: initialValue },
  });

  const { submit, isValid: isFormValid } = form;

  useEffect(() => {
    onChange({ isValid: isFormValid, submit });
  }, [isFormValid, onChange, submit]);

  return (
    <Form form={form}>
      <UseField
        path="value"
        component={TextField}
        componentProps={{
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading,
            isLoading,
            'data-test-subj': `case-toggle-custom-field-form-field-${customFieldKey}`,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const EditComponent: CustomFieldType['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const [isEdit, setIsEdit] = useState(false);

  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: '' } }),
  });

  const onEdit = () => {
    setIsEdit(true);
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  const onSubmitCustomField = async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        field: { value: [data.value] },
      } as CaseUI['customFields'][number]);
    }

    setIsEdit(false);
  };

  const initialValue = customField.field.value?.[0] as string;
  const title = customFieldConfiguration?.label ?? UNKNOWN;
  const isTextFieldValid = formState.isValid;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
        {isLoading && (
          <EuiLoadingSpinner data-test-subj={`case-text-custom-field-loading-${customField.key}`} />
        )}
        {!isLoading && canUpdate && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={`case-text-custom-field-edit-button-${customField.key}`}
              aria-label={EDIT_CUSTOM_FIELDS_ARIA_LABEL(title)}
              iconType={'pencil'}
              onClick={onEdit}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        gutterSize="m"
        data-test-subj={`case-text-custom-field-${customField.key}`}
        direction="column"
      >
        {!isEdit && (
          <EuiFlexItem>
            <View customField={customField} />
          </EuiFlexItem>
        )}
        {isEdit && canUpdate && (
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <FormWrapperComponent
                initialValue={initialValue}
                isLoading={isLoading}
                onChange={setFormState}
                customFieldKey={customField.key}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    data-test-subj={`case-text-custom-field-submit-button-${customField.key}`}
                    fill
                    iconType="save"
                    onClick={onSubmitCustomField}
                    size="s"
                    disabled={isTextFieldValid || isLoading}
                  >
                    {SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj={`case-text-custom-field-cancel-button-${customField.key}`}
                    iconType="cross"
                    onClick={onCancel}
                    size="s"
                  >
                    {CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
