/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import {
  FieldHook,
  Form,
  FormDataProvider,
  SuperSelectField,
  UseField,
  useForm,
} from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';
import { useLoadIndexMappings } from '../../../../../services';
import { getFieldConfig } from '../../../lib';

interface Props {
  onChange(value: unknown): void;
  'data-test-subj'?: string;
}

export const ReferenceFieldSelects = ({ onChange, 'data-test-subj': dataTestSubj }: Props) => {
  const { form } = useForm({ defaultValue: { main: 'body-content' } });
  const { subscribe } = form;

  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const { data } = useLoadIndexMappings(queryParams.get('indexName') ?? '');
  const referenceFieldOptions: SuperSelectOption[] = [];
  if (data && data.mappings && data.mappings.properties) {
    Object.keys(data.mappings.properties).forEach((key) => {
      const field = data.mappings.properties[key];
      if (field.type === 'text') {
        referenceFieldOptions.push({ value: key, inputDisplay: key });
      }
    });
  }
  const fieldConfigReferenceField = getFieldConfig('reference_field');

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
      <FormDataProvider pathsToWatch="main">
        {({ main }) => {
          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <UseField path="main" config={fieldConfigReferenceField}>
                  {(field) => renderSelect(field, referenceFieldOptions)}
                </UseField>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      </FormDataProvider>
    </Form>
  );
};
