/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { ActionRequiredBadge } from '../badges/action_required';
import { ReviewRequiredBadge } from '../badges/review_required_badge';
import { ReadyForUpgradeBadge } from '../badges/ready_for_upgrade_badge';
import * as i18n from './translations';

interface RuleUpgradeCalloutProps {
  numOfSolvableConflicts: number;
  numOfNonSolvableConflicts: number;
}

export function RuleUpgradeCallout({
  numOfSolvableConflicts,
  numOfNonSolvableConflicts,
}: RuleUpgradeCalloutProps): JSX.Element {
  if (numOfNonSolvableConflicts > 0) {
    return (
      <EuiCallOut
        title={
          <>
            <strong>{i18n.UPGRADE_STATUS}</strong>
            &nbsp;
            <ActionRequiredBadge />
            &nbsp;
            {numOfSolvableConflicts > 0
              ? i18n.RULE_HAS_NON_SOLVABLE_AND_SOLVABLE_CONFLICTS(
                  numOfNonSolvableConflicts,
                  numOfSolvableConflicts
                )
              : i18n.RULE_HAS_NON_SOLVABLE_CONFLICTS(numOfNonSolvableConflicts)}
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
