/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { useForm, Form } from '../../../../../../../shared_imports';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import type {
  DiffableAllFields,
  DiffableRule,
} from '../../../../../../../../common/api/detection_engine';
import { useFinalSideContext } from '../../final_side/final_side_context';
import { useDiffableRuleContext } from '../../diffable_rule_context';
import * as i18n from '../../translations';
import type { RuleFieldEditComponentProps } from './rule_field_edit_component_props';

type RuleFieldEditComponent = React.ComponentType<RuleFieldEditComponentProps>;

export type FieldDeserializerFn = (
  defaultRuleFieldValue: FormData,
  finalDiffableRule: DiffableRule
) => FormData;

interface RuleFieldEditFormWrapperProps {
  component: RuleFieldEditComponent;
  ruleFieldFormSchema?: FormSchema;
  deserializer?: FieldDeserializerFn;
  serializer?: (formData: FormData) => FormData;
}

/**
 * RuleFieldEditFormWrapper component manages form state and renders "Save" and "Cancel" buttons.
 *
 * @param {Object} props - Component props.
 * @param {React.ComponentType} props.component - Field component to be wrapped.
 * @param {FormSchema} props.ruleFieldFormSchema - Configuration schema for the field.
 * @param {Function} props.deserializer - Deserializer prepares initial form data. It converts field value from a DiffableRule format to a format used by the form.
 * @param {Function} props.serializer - Serializer prepares form data for submission. It converts form data back to a DiffableRule format.
 */
export function RuleFieldEditFormWrapper({
  component: FieldComponent,
  ruleFieldFormSchema,
  deserializer,
  serializer,
}: RuleFieldEditFormWrapperProps) {
  const { fieldName, setReadOnlyMode } = useFinalSideContext();
  const { finalDiffableRule, setRuleFieldResolvedValue } = useDiffableRuleContext();

  const deserialize = useCallback(
    (defaultValue: FormData): FormData =>
      deserializer ? deserializer(defaultValue, finalDiffableRule) : defaultValue,
    [deserializer, finalDiffableRule]
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
    schema: ruleFieldFormSchema,
    defaultValue: getDefaultValue(fieldName, finalDiffableRule),
    deserializer: deserialize,
    serializer,
    onSubmit: handleSubmit,
  });

  // form.isValid has `undefined` value until all fields are dirty.
  // Run the validation upfront to visualize form validity state.
  useEffect(() => {
    form.validate();
  }, [form]);

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiButtonEmpty iconType="cross" onClick={setReadOnlyMode}>
          {i18n.CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButtonEmpty iconType="save" onClick={form.submit} disabled={!form.isValid}>
          {i18n.SAVE_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <Form form={form}>
        <FieldComponent
          finalDiffableRule={finalDiffableRule}
          setFieldValue={form.setFieldValue}
          resetForm={form.reset}
        />
      </Form>
    </>
  );
}

function getDefaultValue(fieldName: string, finalDiffableRule: Record<string, unknown>): FormData {
  return { [fieldName]: finalDiffableRule[fieldName] };
}
