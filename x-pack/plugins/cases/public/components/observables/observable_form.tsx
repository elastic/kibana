/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, memo, useState } from 'react';
import {
  useForm,
  Form,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import {
  TextAreaField,
  SelectField,
  TextField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { ObservablePatch, ObservablePost } from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import * as i18n from './translations';
import { fieldsConfig, normalizeValueType } from './fields_config';

export interface ObservableFormFieldsProps {
  observable?: Observable;
}

export const ObservableFormFields = memo(({ observable }: ObservableFormFieldsProps) => {
  const { data, isLoading } = useGetCaseConfiguration();
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>(observable?.typeKey ?? '');

  const { validateFields } = useFormContext();

  const options = useMemo(() => {
    return [...OBSERVABLE_TYPES_BUILTIN, ...data.observableTypes].map((observableType) => ({
      value: observableType.key,
      text: observableType.label,
    }));
  }, [data.observableTypes]);

  const handleSelectedTypeChange = useCallback(
    (selectedTypeKeyValue: string) => {
      validateFields(['value']);
      setSelectedTypeKey(selectedTypeKeyValue);
    },
    [validateFields]
  );

  return (
    <>
      {!observable && (
        <UseField
          component={SelectField}
          componentProps={{ euiFieldProps: { options, hasNoInitialSelection: true, isLoading } }}
          onChange={handleSelectedTypeChange}
          path="typeKey"
          config={fieldsConfig.typeKey}
        />
      )}
      <UseField
        path="value"
        config={fieldsConfig.value[normalizeValueType(selectedTypeKey)]}
        componentProps={{ placeholder: i18n.VALUE_PLACEHOLDER }}
        component={TextField}
      />
      <UseField path="description" config={fieldsConfig.description} component={TextAreaField} />
    </>
  );
});
ObservableFormFields.displayName = 'ObservableFormFields';

export interface ObservableFormProps {
  isLoading: boolean;
  onSubmit: (observable: ObservablePatch | ObservablePost) => Promise<void>;
  observable?: Observable;
  onCancel: VoidFunction;
}

export const ObservableForm: FC<ObservableFormProps> = ({
  isLoading,
  onSubmit,
  observable,
  onCancel,
}) => {
  const { form } = useForm({
    defaultValue: observable ?? {
      typeKey: '',
      value: '',
      description: '',
    },
    options: { stripEmptyFields: false },
  });

  const handleSubmitClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const isValid = await form.validate();
      const { data } = await form.submit(e);

      if (isValid) {
        return onSubmit({
          ...data,
        });
      }
    },
    [form, onSubmit]
  );

  return (
    <Form form={form}>
      <ObservableFormFields observable={observable} />
      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiButton onClick={onCancel}>{i18n.CANCEL}</EuiButton>

        <EuiButton
          data-test-subj="save-observable"
          onClick={handleSubmitClick}
          isLoading={isLoading}
        >
          {observable ? i18n.SAVE_OBSERVABLE : i18n.ADD_OBSERVABLE}
        </EuiButton>
      </EuiFlexGroup>
    </Form>
  );
};

ObservableForm.displayName = 'ObservableForm';
