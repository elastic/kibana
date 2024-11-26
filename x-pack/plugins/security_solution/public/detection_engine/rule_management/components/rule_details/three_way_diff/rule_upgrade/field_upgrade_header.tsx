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
import { ModifiedBadge } from '../badges/modified_badge';
import { FieldUpgradeStateInfo } from '../field_upgrade_state_info';

interface FieldUpgradeHeaderProps {
  fieldName: string;
  fieldUpgradeState: FieldUpgradeState;
  /**
   * Whether the field was customized by users (current and base versions differ)
   */
  isCustomized: boolean;
}

export function FieldUpgradeHeader({
  fieldName,
  fieldUpgradeState,
  isCustomized,
}: FieldUpgradeHeaderProps): JSX.Element {
  return (
    <EuiFlexGroup direction="row" alignItems="center">
      <EuiTitle data-test-subj="ruleUpgradeFieldDiffLabel" size="xs">
        <h5>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h5>
      </EuiTitle>

      <span>
        {isCustomized && (
          <>
            <ModifiedBadge />
            &nbsp;
          </>
        )}
        <FieldUpgradeStateInfo state={fieldUpgradeState} />
      </span>
    </EuiFlexGroup>
  );
}
