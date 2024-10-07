/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiTitle } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';

interface FieldUpgradeConflictsResolverHeaderProps {
  fieldName: string;
}

export function FieldUpgradeConflictsResolverHeader({
  fieldName,
}: FieldUpgradeConflictsResolverHeaderProps): JSX.Element {
  return (
    <EuiTitle data-test-subj="ruleUpgradeFieldDiffLabel" size="xs">
      <h5>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h5>
    </EuiTitle>
  );
}
