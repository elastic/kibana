/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FieldUpgradeState, type RuleUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../../common/components/utility_bar';
import * as i18n from './translations';

interface UpgradeInfoBarProps {
  ruleUpgradeState: RuleUpgradeState;
}

export function RuleUpgradeInfoBar({ ruleUpgradeState }: UpgradeInfoBarProps): JSX.Element {
  const numOfFieldsWithUpdates = ruleUpgradeState.customizableFieldsDiff.num_fields_with_updates;
  const numOfSolvedConflicts = useMemo(
    () =>
      Object.values(ruleUpgradeState.fieldsUpgradeState).filter(
        (x) => x === FieldUpgradeState.SolvableConflict
      ).length,
    [ruleUpgradeState.fieldsUpgradeState]
  );
  const numOfUnsolvedConflicts = useMemo(
    () =>
      Object.values(ruleUpgradeState.fieldsUpgradeState).filter(
        (x) => x === FieldUpgradeState.NonSolvableConflict
      ).length,
    [ruleUpgradeState.fieldsUpgradeState]
  );

  return (
    <UtilityBar>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.NUM_OF_FIELDS_WITH_UPDATES(numOfFieldsWithUpdates)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.NUM_OF_SOLVED_CONFLICTS(numOfSolvedConflicts)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.NUM_OF_UNSOLVED_CONFLICTS(numOfUnsolvedConflicts)}
          </UtilityBarText>
        </UtilityBarGroup>
      </UtilityBarSection>
      <UtilityBarSection>
        <UtilityBarGroup>
          <i18n.RuleUpgradeHelper />
        </UtilityBarGroup>
      </UtilityBarSection>
    </UtilityBar>
  );
}
