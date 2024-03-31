/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

import { useComponentTemplatesContext } from '../../../../component_templates/component_templates_context';
import { getFieldConfig } from '../../../lib';
import { FieldHook, Form, SuperSelectField, UseField, useForm } from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';
interface Props {
  onChange(value: string): void;
  'data-test-subj'?: string;
}

export const InferenceIdSelects = ({ onChange, 'data-test-subj': dataTestSubj }: Props) => {
  const { form } = useForm({ defaultValue: { main: 'elser_model_2' } });
  const { subscribe } = form;
  const { api } = useComponentTemplatesContext();
  const [inferenceModels, setInferenceModels] = useState<any>([]);

  const fieldConfigModelId = getFieldConfig('inference_id');
  const defaultInferenceIds: SuperSelectOption[] = [
    { value: 'elser_model_2', inputDisplay: 'elser_model_2' },
    { value: 'e5', inputDisplay: 'e5' },
  ];

  const inferenceIdOptionsFromModels: SuperSelectOption[] =
    inferenceModels?.data?.map((model: any) => ({
      value: model.model_id,
      inputDisplay: model.model_id,
    })) || [];

  const inferenceIdOptions: SuperSelectOption[] = [
    ...defaultInferenceIds,
    ...inferenceIdOptionsFromModels,
  ];

  useEffect(() => {
    const fetchInferenceModels = async () => {
      const models = await api.getInferenceModels();
      setInferenceModels(models);
    };

    fetchInferenceModels();
  }, [api]);

  useEffect(() => {
    const subscription = subscribe((updateData) => {
      const formData = updateData.data.internal;
      const value = formData.main;
      onChange(value);
    });

    return subscription.unsubscribe;
  }, [subscribe, onChange]);

  const renderSelect = (field: FieldHook, opts: SuperSelectOption[]) => {
    return (
      <SuperSelectField
        field={field}
        euiFieldProps={{ options: opts }}
        data-test-subj={dataTestSubj}
      />
    );
  };

  return (
    <Form form={form}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <UseField path="main" config={fieldConfigModelId}>
            {(field) => renderSelect(field, inferenceIdOptions)}
          </UseField>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.noReferenceModelStartWarningMessage',
              {
                defaultMessage:
                  'The referenced model for this inference endpoint will be stated when adding this field.',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
