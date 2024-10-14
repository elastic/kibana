/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { useForm, Form } from '../../../../../../shared_imports';
import type { FormSchema, FormData } from '../../../../../../shared_imports';
import type {
  DiffableAllFields,
  DiffableRule,
} from '../../../../../../../common/api/detection_engine';
import { useFinalSideContext } from '../final_side/final_side_context';
import { useDiffableRuleContext } from '../diffable_rule_context';
import * as i18n from '../translations';

type FieldComponent = React.ComponentType<{
  finalDiffableRule: DiffableRule;
  setValidity: (isValid: boolean) => void;
  setFieldValue: (fieldName: string, fieldValue: unknown) => void;
}>;

interface FieldFormWrapperProps {
  component: FieldComponent;
  fieldFormSchema: FormSchema;
  deserializer?: (fieldValue: FormData, finalDiffableRule: DiffableRule) => FormData;
  serializer?: (formData: FormData) => FormData;
}

/**
 * FieldFormWrapper component manages form state and renders "Save" and "Cancel" buttons.
 *
 * @param {Object} props - Component props.
 * @param {React.ComponentType} props.component - Field component to be wrapped.
 * @param {FormSchema} props.fieldFormSchema - Configuration schema for the field.
 * @param {Function} props.deserializer - Deserializer prepares initial form data. It converts field value from a DiffableRule format to a format used by the form.
 * @param {Function} props.serializer - Serializer prepares form data for submission. It converts form data back to a DiffableRule format.
 */
export function FieldFormWrapper({
  component: FieldComponent,
  fieldFormSchema,
  deserializer,
  serializer,
}: FieldFormWrapperProps) {
  const { fieldName, setReadOnlyMode } = useFinalSideContext();
  const { finalDiffableRule, setRuleFieldResolvedValue } = useDiffableRuleContext();

  const deserialize = useCallback(
    (defaultValue: FormData): FormData => {
      if (!deserializer) {
        return defaultValue;
      }

      const rule = finalDiffableRule as Record<string, unknown>;
      const fieldValue = rule[fieldName] as FormData;
      return deserializer(fieldValue, finalDiffableRule);
    },
    [deserializer, fieldName, finalDiffableRule]
  );

  const handleSubmit = useCallback(
    async (formData: FormData, isValid: boolean) => {
      if (!isValid) {
        return;
      }

      setRuleFieldResolvedValue({
        ruleId: finalDiffableRule.rule_id,
        fieldName: fieldName as keyof DiffableAllFields,
        resolvedValue: formData[fieldName],
      });
      setReadOnlyMode();
    },
    [fieldName, finalDiffableRule.rule_id, setReadOnlyMode, setRuleFieldResolvedValue]
  );

  const { form } = useForm({
    schema: fieldFormSchema,
    defaultValue: getDefaultValue(fieldName, finalDiffableRule),
    deserializer: deserialize,
    serializer,
    onSubmit: handleSubmit,
  });

  const [validity, setValidity] = useState<boolean | undefined>(undefined);

  const isValid = validity === undefined ? form.isValid : validity;

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiButtonEmpty iconType="cross" onClick={setReadOnlyMode}>
          {i18n.CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButtonEmpty iconType="save" onClick={form.submit} disabled={isValid === false}>
          {i18n.SAVE_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <Form form={form}>
        <FieldComponent
          finalDiffableRule={finalDiffableRule}
          setValidity={setValidity}
          setFieldValue={form.setFieldValue}
        />
      </Form>
    </>
  );
}

function getDefaultValue(fieldName: string, finalDiffableRule: Record<string, unknown>): FormData {
  return { [fieldName]: finalDiffableRule[fieldName] };
}
