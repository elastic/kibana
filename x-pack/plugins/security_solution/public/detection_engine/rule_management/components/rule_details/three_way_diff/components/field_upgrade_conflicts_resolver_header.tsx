/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';
import type { FieldUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeStateInfo } from './field_upgrade_state_info';

interface FieldUpgradeConflictsResolverHeaderProps {
  fieldName: string;
  fieldUpgradeState: FieldUpgradeState;
}

export function FieldUpgradeConflictsResolverHeader({
  fieldName,
  fieldUpgradeState,
}: FieldUpgradeConflictsResolverHeaderProps): JSX.Element {
  return (
    <EuiFlexGroup direction="row" alignItems="center">
      <EuiTitle data-test-subj="ruleUpgradeFieldDiffLabel" size="xs">
        <h5>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h5>
      </EuiTitle>

      <FieldUpgradeStateInfo state={fieldUpgradeState} />
    </EuiFlexGroup>
  );
}
