/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useLoadIndexMappings } from '../../../../../services';
import { getFieldConfig } from '../../../lib';
import { Form, SuperSelectField, UseField, useForm } from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';

interface Props {
  onChange(value: string): void;
  'data-test-subj'?: string;
  indexName?: string;
}

export const ReferenceFieldSelects = ({
  onChange,
  'data-test-subj': dataTestSubj,
  indexName,
}: Props) => {
  const { form } = useForm();
  const { subscribe } = form;

  const { data } = useLoadIndexMappings(indexName ?? '');
  const referenceFieldOptions: SuperSelectOption[] = [];
  if (data && data.mappings && data.mappings.properties) {
    Object.keys(data.mappings.properties).forEach((key) => {
      const field = data.mappings.properties[key];
      if (field.type === 'text') {
        referenceFieldOptions.push({
          value: key,
          inputDisplay: key,
          'data-test-subj': `select-reference-field-${key}`,
        });
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
  return (
    <Form form={form} data-test-subj="referenceField">
      <UseField path="main" config={fieldConfigReferenceField}>
        {(field) => (
          <SuperSelectField
            field={field}
            euiFieldProps={{
              options: referenceFieldOptions,
            }}
            data-test-subj={dataTestSubj}
          />
        )}
      </UseField>
    </Form>
  );
};
