/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';

import type { CaseUI } from '../../../common';
import { AddObservable } from './add_observable';

interface ObservablesUtilityBarProps {
  caseData: CaseUI;
}

export const ObservablesUtilityBar = ({ caseData }: ObservablesUtilityBarProps) => {
  return (
    <EuiFlexGroup alignItems="center">
      <AddObservable caseData={caseData} />
    </EuiFlexGroup>
  );
};

ObservablesUtilityBar.displayName = 'ObservablesUtilityBar';
