/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, memo, useState } from 'react';
import { useForm, Form, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import {
  TextAreaField,
  SelectField,
  TextField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { ObservablePatchType, Observable } from '../../../common/types/domain';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import * as i18n from './translations';
import { fieldsConfig, normalizeValueType } from './fields_config';

export const ObservableFormFields = memo(() => {
  const { data, isLoading } = useGetCaseConfiguration();
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>('');

  const options = useMemo(() => {
    return [...OBSERVABLE_TYPES_BUILTIN, ...data.observableTypes].map((observableType) => ({
      value: observableType.key,
      text: observableType.label,
    }));
  }, [data.observableTypes]);

  return (
    <>
      <UseField
        component={SelectField}
        componentProps={{ euiFieldProps: { options, hasNoInitialSelection: true, isLoading } }}
        onChange={setSelectedTypeKey}
        path="typeKey"
        config={fieldsConfig.typeKey}
      />
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
  onSubmit: (observable: ObservablePatchType) => Promise<void>;
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
      await form.validate();
      const { isValid, data } = await form.submit(e);

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
      <ObservableFormFields />
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
