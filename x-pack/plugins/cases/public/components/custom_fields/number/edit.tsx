/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import {
  useForm,
  UseField,
  Form,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CasesConfigurationUICustomField } from '../../../../common/ui';
import type { CustomFieldType } from '../types';
import { View } from './view';
import {
  CANCEL,
  EDIT_CUSTOM_FIELDS_ARIA_LABEL,
  NO_CUSTOM_FIELD_SET,
  SAVE,
  POPULATED_WITH_DEFAULT,
} from '../translations';
import { getNumberFieldConfig } from './config';

const isEmpty = (value: number | null | undefined) => {
  return value == null;
};

interface FormState {
  value: number | null;
  isValid?: boolean;
  submit: FormHook<{ value: number | null }>['submit'];
}

interface FormWrapper {
  initialValue: number | null;
  isLoading: boolean;
  customFieldConfiguration: CasesConfigurationUICustomField;
  onChange: (state: FormState) => void;
}

const FormWrapperComponent: React.FC<FormWrapper> = ({
  initialValue,
  customFieldConfiguration,
  isLoading,
  onChange,
}) => {
  const { form } = useForm<{ value: number | null }>({
    defaultValue: {
      value:
        customFieldConfiguration?.defaultValue != null && isEmpty(initialValue)
          ? Number(customFieldConfiguration.defaultValue)
          : initialValue,
    },
  });

  const [{ value }] = useFormData({ form });
  const { submit, isValid } = form;
  const formFieldConfig = getNumberFieldConfig({
    required: customFieldConfiguration.required,
    label: customFieldConfiguration.label,
  });
  const populatedWithDefault =
    value === customFieldConfiguration?.defaultValue && isEmpty(initialValue);

  useEffect(() => {
    onChange({
      value,
      isValid,
      submit,
    });
  }, [isValid, onChange, submit, value]);

  return (
    <Form form={form}>
      <UseField
        path="value"
        config={formFieldConfig}
        component={NumericField}
        helpText={populatedWithDefault && POPULATED_WITH_DEFAULT}
        componentProps={{
          euiFieldProps: {
            fullWidth: true,
            disabled: isLoading,
            isLoading,
            'data-test-subj': `case-number-custom-field-form-field-${customFieldConfiguration.key}`,
          },
        }}
      />
    </Form>
  );
};

FormWrapperComponent.displayName = 'FormWrapper';

const EditComponent: CustomFieldType<CaseCustomFieldNumber>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = customField?.value ?? null;
  const [isEdit, setIsEdit] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: { value: null } }),
    value: initialValue,
  });

  const onEdit = useCallback(() => {
    setIsEdit(true);
  }, []);

  const onCancel = useCallback(() => {
    setIsEdit(false);
  }, []);

  const onSubmitCustomField = useCallback(async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.NUMBER,
        value: data.value ? Number(data.value) : null,
      });
    }
    setIsEdit(false);
  }, [customField, customFieldConfiguration.key, formState, onSubmit]);

  const title = customFieldConfiguration.label;

  const isNumberFieldValid =
    formState.isValid ||
    (formState.value === customFieldConfiguration.defaultValue && isEmpty(initialValue));

  const isCustomFieldValueDefined = !isEmpty(customField?.value);

  return (
    <>
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
          <EuiLoadingSpinner
            data-test-subj={`case-number-custom-field-loading-${customFieldConfiguration.key}`}
          />
        )}
        {!isLoading && canUpdate && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={`case-number-custom-field-edit-button-${customFieldConfiguration.key}`}
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
        data-test-subj={`case-number-custom-field-${customFieldConfiguration.key}`}
        direction="column"
      >
        {!isCustomFieldValueDefined && !isEdit && (
          <p data-test-subj="no-number-custom-field-value">{NO_CUSTOM_FIELD_SET}</p>
        )}
        {!isEdit && isCustomFieldValueDefined && (
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
                customFieldConfiguration={customFieldConfiguration}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    data-test-subj={`case-number-custom-field-submit-button-${customFieldConfiguration.key}`}
                    fill
                    iconType="save"
                    onClick={onSubmitCustomField}
                    size="s"
                    disabled={!isNumberFieldValid || isLoading}
                  >
                    {SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj={`case-number-custom-field-cancel-button-${customFieldConfiguration.key}`}
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
    </>
  );
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);
