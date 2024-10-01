/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { useForm, type FormSchema, Form } from '../../../../../../shared_imports';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';
import { useFinalEditContext } from './final_edit_context';
import { useDiffableRuleContext } from '../diffable_rule_context';

interface FieldFormWrapperProps {
  component: React.ComponentType;
  fieldFormSchema: FormSchema;
}

export function FieldFormWrapper({
  component: FieldComponent,
  fieldFormSchema,
}: FieldFormWrapperProps) {
  const { fieldName, setReadOnlyMode } = useFinalEditContext();

  const { finalDiffableRule, setRuleFieldResolvedValue } = useDiffableRuleContext();

  const { form } = useForm({
    schema: fieldFormSchema,
    defaultValue: {
      [fieldName]: finalDiffableRule[fieldName],
    },
    serializer: (value) => value,
    onSubmit: async (formData) => {
      setRuleFieldResolvedValue({
        fieldName: fieldName as keyof DiffableAllFields, // TODO: This is temporary until we decide which type to use
        resolvedValue: formData[fieldName],
      });
      setReadOnlyMode();
    },
  });

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiButtonEmpty iconType="cross" onClick={setReadOnlyMode}>
          {'Cancel'}
        </EuiButtonEmpty>
        <EuiButtonEmpty iconType="save" onClick={form.submit} disabled={form.isValid === false}>
          {'Save'}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <Form form={form}>
        <FieldComponent />
      </Form>
    </>
  );
}
