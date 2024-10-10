/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DiffableCommonFields } from '../../../../../../../common/api/detection_engine';
import type {
  DiffableThreatMatchFields,
  DiffableCustomQueryFields,
  DiffableRuleTypes,
  DiffableThresholdFields,
  DiffableNewTermsFields,
} from '../../../../../../../common/api/detection_engine';
import { FinalEditContextProvider } from './final_edit_context';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { useDiffableRuleContext } from '../diffable_rule_context';
import { CommonRuleFieldEdit } from './common_rule_field_edit';
import { CustomQueryRuleFieldEdit } from './custom_query_rule_field_edit';
import { SavedQueryRuleFieldEdit } from './saved_query_rule_field_edit';
import { ThreatMatchRuleFieldEdit } from './threat_match_rule_field_edit';
import { ThresholdRuleFieldEdit } from './threshold_rule_field_edit';
import { NewTermsRuleFieldEdit } from './new_terms_rule_field_edit';

interface FinalEditProps {
  fieldName: string;
  setReadOnlyMode: () => void;
}

export function FinalEdit({ fieldName, setReadOnlyMode }: FinalEditProps) {
  const { finalDiffableRule } = useDiffableRuleContext();

  return (
    <FinalEditContextProvider value={{ fieldName, setReadOnlyMode }}>
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
      return <CustomQueryRuleFieldEdit fieldName={fieldName as keyof DiffableCustomQueryFields} />;
    case 'saved_query':
      return <SavedQueryRuleFieldEdit fieldName={fieldName as keyof DiffableCustomQueryFields} />;
    case 'eql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'esql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'threat_match':
      return <ThreatMatchRuleFieldEdit fieldName={fieldName as keyof DiffableThreatMatchFields} />;
    case 'threshold':
      return <ThresholdRuleFieldEdit fieldName={fieldName as keyof DiffableThresholdFields} />;
    case 'machine_learning':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'new_terms':
      return <NewTermsRuleFieldEdit fieldName={fieldName as keyof DiffableNewTermsFields} />;
    default:
      return assertUnreachable(ruleType);
  }
}
