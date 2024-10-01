/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DiffableCommonFields } from '../../../../../../../common/api/detection_engine';
import type { DiffableRuleTypes } from '../../../../../../../common/api/detection_engine';
import { FinalEditContextProvider } from './final_edit_context';
import { CommonRuleFieldEdit } from './common_rule_field_edit';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { useDiffableRuleContext } from '../diffable_rule_context';

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
