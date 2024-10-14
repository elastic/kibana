/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableRuleTypes } from '../../../../../../../common/api/detection_engine';
import { FinalEditContextProvider } from './final_edit_context';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { useDiffableRuleContext } from '../diffable_rule_context';
import { CommonRuleFieldEdit } from './common_rule_field_edit';
import { CustomQueryRuleFieldEdit } from './custom_query_rule_field_edit';
import { SavedQueryRuleFieldEdit } from './saved_query_rule_field_edit';
import { ThreatMatchRuleFieldEdit } from './threat_match_rule_field_edit';
import { ThresholdRuleFieldEdit } from './threshold_rule_field_edit';
import { NewTermsRuleFieldEdit } from './new_terms_rule_field_edit';
import type {
  UpgradeableDiffableFields,
  UpgradeableCustomQueryFields,
  UpgradeableSavedQueryFields,
  UpgradeableThreatMatchFields,
  UpgradeableThresholdFields,
  UpgradeableNewTermsFields,
} from '../../../../model/prebuilt_rule_upgrade/fields';
import { isCommonFieldName } from '../../../../model/prebuilt_rule_upgrade/fields';

interface FinalEditProps {
  fieldName: UpgradeableDiffableFields;
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
  fieldName: UpgradeableDiffableFields;
  ruleType: DiffableRuleTypes;
}

function FieldEdit({ fieldName, ruleType }: FinalEditFieldProps) {
  if (isCommonFieldName(fieldName)) {
    return <CommonRuleFieldEdit fieldName={fieldName} />;
  }

  switch (ruleType) {
    case 'query':
      return <CustomQueryRuleFieldEdit fieldName={fieldName as UpgradeableCustomQueryFields} />;
    case 'saved_query':
      return <SavedQueryRuleFieldEdit fieldName={fieldName as UpgradeableSavedQueryFields} />;
    case 'eql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'esql':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'threat_match':
      return <ThreatMatchRuleFieldEdit fieldName={fieldName as UpgradeableThreatMatchFields} />;
    case 'threshold':
      return <ThresholdRuleFieldEdit fieldName={fieldName as UpgradeableThresholdFields} />;
    case 'machine_learning':
      return <span>{'Rule type not yet implemented'}</span>;
    case 'new_terms':
      return <NewTermsRuleFieldEdit fieldName={fieldName as UpgradeableNewTermsFields} />;
    default:
      return assertUnreachable(ruleType);
  }
}
