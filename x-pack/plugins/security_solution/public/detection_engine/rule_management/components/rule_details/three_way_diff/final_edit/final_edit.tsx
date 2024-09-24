/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SetFieldResolvedValueFn } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { NameEdit, nameSchema } from './fields/name';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';
import { FieldFormWrapper } from './field_form_wrapper';
import { FinalEditContextProvider } from './final_edit_context';

interface FinalEditProps {
  fieldName: string;
  finalDiffableRule: DiffableRule;
  setReadOnlyMode: () => void;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function FinalEdit({
  fieldName,
  finalDiffableRule,
  setReadOnlyMode,
  setFieldResolvedValue,
}: FinalEditProps) {
  return (
    <FinalEditContextProvider
      value={{ fieldName, finalDiffableRule, setReadOnlyMode, setFieldResolvedValue }}
    >
      <FinalEditField fieldName={fieldName} />
    </FinalEditContextProvider>
  );
}

interface FinalEditFieldProps {
  fieldName: string;
}

function FinalEditField({ fieldName }: FinalEditFieldProps) {
  if (fieldName === 'name') {
    return <FieldFormWrapper component={NameEdit} fieldFormSchema={nameSchema} />;
  }

  return <span>{'Field not yet implemented'}</span>;
}
