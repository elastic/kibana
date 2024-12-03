/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FieldUpgradeState, type RuleUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { ActionRequiredBadge } from '../badges/action_required';
import { ReviewRequiredBadge } from '../badges/review_required_badge';
import { ReadyForUpgradeBadge } from '../badges/ready_for_upgrade_badge';
import * as i18n from './translations';

interface RuleUpgradeCalloutProps {
  ruleUpgradeState: RuleUpgradeState;
}

export function RuleUpgradeCallout({ ruleUpgradeState }: RuleUpgradeCalloutProps): JSX.Element {
  const fieldsUpgradeState = ruleUpgradeState.fieldsUpgradeState;
  const [numOfNonSolvableConflicts, numOfSolvableConflicts] = useMemo(() => {
    let nonSolvableConflicts = 0;
    let solvableConflicts = 0;

    for (const state of Object.values(fieldsUpgradeState)) {
      if (state === FieldUpgradeState.NonSolvableConflict) {
        nonSolvableConflicts++;
      } else if (state === FieldUpgradeState.SolvableConflict) {
        solvableConflicts++;
      }
    }

    return [nonSolvableConflicts, solvableConflicts];
  }, [fieldsUpgradeState]);

  if (numOfNonSolvableConflicts > 0) {
    return (
      <EuiCallOut
        title={
          <>
            <strong>{i18n.UPGRADE_STATUS}</strong>
            &nbsp;
            <ActionRequiredBadge />
            &nbsp;
            {i18n.RULE_HAS_NON_SOLVABLE_CONFLICTS(numOfNonSolvableConflicts)}
          </>
        }
        color="danger"
        size="s"
      >
        <p>{i18n.RULE_HAS_NON_SOLVABLE_CONFLICTS_DESCRIPTION}</p>
      </EuiCallOut>
    );
  }

  if (numOfSolvableConflicts > 0) {
    return (
      <EuiCallOut
        title={
          <>
            <strong>{i18n.UPGRADE_STATUS}</strong>
            &nbsp;
            <ReviewRequiredBadge />
            &nbsp;
            {i18n.RULE_HAS_SOLVABLE_CONFLICTS(numOfSolvableConflicts)}
          </>
        }
        color="warning"
        size="s"
      >
        <p>{i18n.RULE_HAS_SOLVABLE_CONFLICTS_DESCRIPTION}</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={
        <>
          <strong>{i18n.UPGRADE_STATUS}</strong>
          &nbsp;
          <ReadyForUpgradeBadge />
        </>
      }
      color="success"
      size="s"
    >
      <p>{i18n.RULE_IS_READY_FOR_UPGRADE_DESCRIPTION}</p>
    </EuiCallOut>
  );
}
