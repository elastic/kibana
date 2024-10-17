/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { RuleUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import * as i18n from './translations';

interface RuleUpgradeCalloutProps {
  ruleUpgradeState: RuleUpgradeState;
}

export function RuleUpgradeCallout({ ruleUpgradeState }: RuleUpgradeCalloutProps): JSX.Element {
  const fieldsUpgradeState = ruleUpgradeState.fieldsUpgradeState;
  const { numOfNonSolvableConflicts, numOfSolvableConflicts } = useMemo(() => {
    let numOfFieldsWithNonSolvableConflicts = 0;
    let numOfFieldsWithSolvableConflicts = 0;

    for (const fieldName of Object.keys(fieldsUpgradeState)) {
      if (fieldsUpgradeState[fieldName] === FieldUpgradeState.NonSolvableConflict) {
        numOfFieldsWithNonSolvableConflicts++;
      }

      if (fieldsUpgradeState[fieldName] === FieldUpgradeState.SolvableConflict) {
        numOfFieldsWithSolvableConflicts++;
      }
    }

    return {
      numOfNonSolvableConflicts: numOfFieldsWithNonSolvableConflicts,
      numOfSolvableConflicts: numOfFieldsWithSolvableConflicts,
    };
  }, [fieldsUpgradeState]);

  if (numOfNonSolvableConflicts > 0) {
    return (
      <EuiCallOut
        title={i18n.RULE_HAS_NON_SOLVABLE_CONFLICTS(numOfNonSolvableConflicts)}
        iconType="warning"
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
        title={i18n.RULE_HAS_SOLVABLE_CONFLICTS(numOfSolvableConflicts)}
        iconType="warning"
        color="warning"
        size="s"
      >
        <p>{i18n.RULE_HAS_SOLVABLE_CONFLICTS_DESCRIPTION}</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18n.RULE_IS_READY_FOR_UPGRADE}
      iconType="checkInCircleFilled"
      color="success"
      size="s"
    >
      <p>{i18n.RULE_IS_READY_FOR_UPGRADE_DESCRIPTION}</p>
    </EuiCallOut>
  );
}
