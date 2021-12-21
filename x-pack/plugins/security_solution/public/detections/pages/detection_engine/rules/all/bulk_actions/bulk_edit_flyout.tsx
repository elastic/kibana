/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
} from '@elastic/eui';
import * as i18n from '../../translations';

import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { useKibana } from '../../../../../../common/lib/kibana';

import {
  Field,
  Form,
  getUseField,
  UseField,
  UseMultiFields,
  useForm,
  useFormData,
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../../../shared_imports';

interface MyForm {
  index: string[];
}

const CommonUseField = getUseField({ component: Field });

interface IndexEditActions {
  index: string[];
}

export const schema: FormSchema<IndexEditActions> = {
  index: {
    fieldsToValidateOnChange: ['index', 'queryBar'],
    type: FIELD_TYPES.COMBO_BOX,
    label: 'Add index patterns for selected rules',
    // helpText: <EuiText size="xs">{INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          // const [{ formData }] = args;

          return fieldValidators.emptyField('A minimum of one index pattern is required.')(...args);
        },
      },
    ],
  },
};

interface FormComponentProps<T> {
  data: T;
  //  getData: (a: T) => void;
  formRef: ReturnType<typeof useRef>;
}

export const FormComponent = <T,>({ data, formRef }: FormComponentProps<T>) => {
  const { uiSettings } = useKibana().services;
  const { form } = useForm<T>({
    defaultValue: data,
    schema,
  });

  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  //   const { getFields, getFormData, reset, submit } = form;
  if (formRef?.current) {
    formRef.current = form;
  }

  return (
    <Form form={form}>
      <CommonUseField
        path="index"
        config={{
          ...schema.index,
        }}
        componentProps={{
          idAria: 'detectionEngineBulkEditIndices',
          'data-test-subj': 'detectionEngineBulkEditIndices',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: defaultPatterns.map((label) => ({ label })),
          },
        }}
      />
    </Form>
  );
};
interface Props {
  onClose: () => void;
  onConfirm: (a: any) => void;
}
const BulkEditFlyoutComponent = ({ onClose, onConfirm }: Props) => {
  const formRef = useRef<ReturnType<typeof useForm>>({} as ReturnType<typeof useForm>);
  const handleSave = () => {
    console.log('HANDLE safe', formRef?.current?.getFormData?.());
    onConfirm(formRef?.current?.getFormData?.());
  };
  const flyoutTitleId = 'Bulk edit flyout';
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutTitleId} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>Add index patterns</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormComponent formRef={formRef} data={{ index: [] }} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onConfirm} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleSave} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const BulkEditFlyout = React.memo(BulkEditFlyoutComponent);

BulkEditFlyout.displayName = 'BulkEditFlyout';
