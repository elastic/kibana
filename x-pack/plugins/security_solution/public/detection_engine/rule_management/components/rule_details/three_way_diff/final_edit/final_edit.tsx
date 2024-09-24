/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { SetFieldResolvedValueFn } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { DiffableCommonFields } from '../../../../../../../common/api/detection_engine';
import type {
  DiffableRule,
  DiffableRuleTypes,
} from '../../../../../../../common/api/detection_engine';
import { FinalEditContextProvider } from './final_edit_context';
import { CommonRuleFieldEdit } from './common_rule_field_edit';
import { assertUnreachable } from '../../../../../../../common/utility_types';

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
      <FieldEdit fieldName={fieldName} ruleType={finalDiffableRule.type} />
    </FinalEditContextProvider>
  );
}

interface FinalEditFieldProps {
  fieldName: string;
  ruleType: DiffableRuleTypes;
}

function FieldEdit({ fieldName, ruleType }: FinalEditFieldProps) {
  const { data: commonField } = useMemo(
    () => DiffableCommonFields.keyof().safeParse(fieldName),
    [fieldName]
  );

  if (commonField) {
    return <CommonRuleFieldEdit fieldName={commonField} />;
  }

  switch (ruleType) {
    case 'query':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'saved_query':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'eql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'esql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'threat_match':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'threshold':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'machine_learning':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'new_terms':
      return <span>{'Rule type not yet implemented'}</span>;
    default:
      return assertUnreachable(ruleType);
  }
}
