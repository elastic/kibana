/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ManualMitigations } from './manual';
import { useDegradedFields } from '../../../../hooks';
import { PossibleMitigationTitle } from './title';

export function PossibleMitigations({ children }: { children?: React.ReactNode }) {
  const { isAnalysisInProgress } = useDegradedFields();

  return (
    !isAnalysisInProgress && (
      <div>
        <EuiSpacer size="s" />
        <PossibleMitigationTitle />
        <EuiSpacer size="m" />
        {children}
        <ManualMitigations />
      </div>
    )
  );
}
