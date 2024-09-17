/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DiffableCommonFields } from '../../../../../../../common/api/detection_engine';
import type {
  DiffableRule,
  DiffableCustomQueryFields,
  DiffableSavedQueryFields,
  DiffableEqlFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
  DiffableNewTermsFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
} from '../../../../../../../common/api/detection_engine';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { CustomQueryRuleFieldReadOnly } from './custom_query_rule_field_readonly';
import { SavedQueryRuleFieldReadOnly } from './saved_query_rule_field_readonly';
import { EqlRuleFieldReadOnly } from './eql_rule_field_readonly';
import { EsqlRuleFieldReadOnly } from './esql_rule_field_readonly';
import { ThreatMatchRuleFieldReadOnly } from './threat_match_rule_field_readonly';
import { ThresholdRuleFieldReadOnly } from './threshold_rule_field_readonly';
import { MachineLearningRuleFieldReadOnly } from './machine_learning_rule_field_readonly';
import { NewTermsRuleFieldReadOnly } from './new_terms_rule_field_readonly';
import { CommonRuleFieldReadOnly } from './common_rule_field_readonly';

interface FieldReadOnlyProps {
  fieldName: string;
  finalDiffableRule: DiffableRule;
}

export function FieldReadOnly({ fieldName, finalDiffableRule }: FieldReadOnlyProps) {
  const { data: commonField } = useMemo(
    () => DiffableCommonFields.keyof().safeParse(fieldName),
    [fieldName]
  );

  if (commonField) {
    return (
      <CommonRuleFieldReadOnly fieldName={commonField} finalDiffableRule={finalDiffableRule} />
    );
  }

  switch (finalDiffableRule.type) {
    case 'query':
      return (
        <CustomQueryRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableCustomQueryFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'saved_query':
      return (
        <SavedQueryRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableSavedQueryFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'eql':
      return (
        <EqlRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableEqlFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'esql':
      return (
        <EsqlRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableEsqlFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'threat_match':
      return (
        <ThreatMatchRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableThreatMatchFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'threshold':
      return (
        <ThresholdRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableThresholdFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'machine_learning':
      return (
        <MachineLearningRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableMachineLearningFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    case 'new_terms':
      return (
        <NewTermsRuleFieldReadOnly
          fieldName={fieldName as keyof DiffableNewTermsFields}
          finalDiffableRule={finalDiffableRule}
        />
      );
    default:
      return assertUnreachable(finalDiffableRule);
  }
}
