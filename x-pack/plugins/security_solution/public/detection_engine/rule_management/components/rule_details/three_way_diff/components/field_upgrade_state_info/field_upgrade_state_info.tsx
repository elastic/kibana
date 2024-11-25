/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText } from '@elastic/eui';
import { FieldUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import * as i18n from './translations';

interface FieldUpgradeStateInfoProps {
  state: FieldUpgradeState;
}

export function FieldUpgradeStateInfo({ state }: FieldUpgradeStateInfoProps): JSX.Element {
  switch (state) {
    case FieldUpgradeState.Accepted:
      return (
        <>
          <EuiText color="success" size="xs">
            <EuiIcon type="checkInCircleFilled" />
            &nbsp;<strong>{i18n.UPDATE_ACCEPTED}</strong>
            {i18n.SEPARATOR}
            {i18n.UPDATE_ACCEPTED_DESCRIPTION}
          </EuiText>
        </>
      );

    case FieldUpgradeState.SolvableConflict:
      return (
        <>
          <EuiText color="warning" size="xs">
            <EuiIcon type="warning" />
            &nbsp;<strong>{i18n.SOLVABLE_CONFLICT}</strong>
            {i18n.SEPARATOR}
            {i18n.SOLVABLE_CONFLICT_DESCRIPTION}
          </EuiText>
        </>
      );

    case FieldUpgradeState.NonSolvableConflict:
      return (
        <>
          <EuiText color="danger" size="xs">
            <EuiIcon type="warning" />
            &nbsp;<strong>{i18n.NON_SOLVABLE_CONFLICT}</strong>
            {i18n.SEPARATOR}
            {i18n.NON_SOLVABLE_CONFLICT_DESCRIPTION}
          </EuiText>
        </>
      );
  }
}
