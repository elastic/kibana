/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';

import { getFieldConfig } from '../../../lib';
import { Form, SuperSelectField, UseField, useForm } from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';
import { InferenceToModelIdMap } from '../fields';
interface Props {
  onChange(value: string): void;
  'data-test-subj'?: string;
  inferenceToModelIdMap?: InferenceToModelIdMap;
  showWarning?: boolean;
}

export const InferenceIdSelects = ({
  onChange,
  'data-test-subj': dataTestSubj,
  inferenceToModelIdMap,
  showWarning = false,
}: Props) => {
  const { form } = useForm({ defaultValue: { main: 'elser_model_2' } });
  const { subscribe } = form;
  const fieldConfigModelId = getFieldConfig('inference_id');

  const inferenceIdOptions: SuperSelectOption[] = inferenceToModelIdMap
    ? Object.keys(inferenceToModelIdMap).map((key) => ({
        value: key,
        inputDisplay: key,
      }))
    : [];

  useEffect(() => {
    const subscription = subscribe((updateData) => {
      const formData = updateData.data.internal;
      const value = formData.main;
      onChange(value);
    });

    return subscription.unsubscribe;
  }, [subscribe, onChange]);

  return (
    <Form form={form}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <UseField path="main" config={fieldConfigModelId}>
            {(field) => (
              <SuperSelectField
                field={field}
                euiFieldProps={{ options: inferenceIdOptions }}
                data-test-subj={dataTestSubj}
              />
            )}
          </UseField>
        </EuiFlexItem>
        {showWarning && (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon color="warning" type="warning" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCallOut
                size="s"
                color="warning"
                title={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.noReferenceModelStartWarningMessage',
                  {
                    defaultMessage:
                      'The referenced model for this inference endpoint will be started when adding this field.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </Form>
  );
};
