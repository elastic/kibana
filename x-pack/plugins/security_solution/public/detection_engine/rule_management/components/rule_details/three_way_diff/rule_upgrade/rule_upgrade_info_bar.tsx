/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../../common/components/utility_bar';
import * as i18n from './translations';

interface RuleUpgradeInfoBarProps {
  numOfFieldsWithUpdates: number;
  numOfSolvableConflicts: number;
  numOfNonSolvableConflicts: number;
}

export function RuleUpgradeInfoBar({
  numOfFieldsWithUpdates,
  numOfSolvableConflicts,
  numOfNonSolvableConflicts,
}: RuleUpgradeInfoBarProps): JSX.Element {
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
            {i18n.NUM_OF_SOLVED_CONFLICTS(numOfSolvableConflicts)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.NUM_OF_UNSOLVED_CONFLICTS(numOfNonSolvableConflicts)}
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
