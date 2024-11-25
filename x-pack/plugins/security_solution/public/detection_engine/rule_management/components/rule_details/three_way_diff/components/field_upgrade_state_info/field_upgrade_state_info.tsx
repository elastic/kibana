/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FieldUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import { ReadyForUpgradeBadge } from '../badges/ready_for_upgrade_badge';
import { ReviewRequiredBadge } from '../badges/review_required_badge';
import { ActionRequiredBadge } from '../badges/action_required';
import * as i18n from './translations';

interface FieldUpgradeStateInfoProps {
  state: FieldUpgradeState;
}

export function FieldUpgradeStateInfo({ state }: FieldUpgradeStateInfoProps): JSX.Element {
  switch (state) {
    case FieldUpgradeState.NoConflict:
      return (
        <>
          <EuiText color="success" size="xs">
            <ReadyForUpgradeBadge />
            &nbsp;&nbsp;
            <strong>{i18n.NO_CONFLICT}</strong>
            {i18n.SEPARATOR}
            {i18n.NO_CONFLICT_DESCRIPTION}
          </EuiText>
        </>
      );

    case FieldUpgradeState.Accepted:
      return (
        <>
          <EuiText color="success" size="xs">
            <ReadyForUpgradeBadge />
            &nbsp;&nbsp;
            {i18n.REVIEWED_AND_ACCEPTED}
          </EuiText>
        </>
      );

    case FieldUpgradeState.SolvableConflict:
      return (
        <>
          <EuiText color="warning" size="xs">
            <ReviewRequiredBadge />
            &nbsp;&nbsp;
            <strong>{i18n.SOLVABLE_CONFLICT}</strong>
            {i18n.SEPARATOR}
            {i18n.SOLVABLE_CONFLICT_DESCRIPTION}
          </EuiText>
        </>
      );

    case FieldUpgradeState.NonSolvableConflict:
      return (
        <>
          <EuiText color="danger" size="xs">
            <ActionRequiredBadge />
            &nbsp;&nbsp;
            <strong>{i18n.NON_SOLVABLE_CONFLICT}</strong>
            {i18n.SEPARATOR}
            {i18n.NON_SOLVABLE_CONFLICT_DESCRIPTION}
          </EuiText>
        </>
      );
  }
}
