/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { PROGRESS_TRACKER_LABEL } from './translations';
import { useProgressBarStyles } from './styles/progress_bar.style';
import type { ProductTier } from './configs';

const ProgressComponent: React.FC<{
  productTier: ProductTier | undefined;
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}> = ({ productTier, totalActiveSteps, totalStepsLeft }) => {
  const stepsDone =
    totalActiveSteps != null && totalStepsLeft != null ? totalActiveSteps - totalStepsLeft : null;
  const { textStyle } = useProgressBarStyles();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {totalActiveSteps != null && totalStepsLeft != null && stepsDone != null && (
        <EuiFlexItem grow={true}>
          <EuiProgress
            value={stepsDone}
            max={totalActiveSteps}
            size="m"
            label={
              <span>
                <span className={textStyle}>{PROGRESS_TRACKER_LABEL}</span>
                <EuiSpacer size="s" />
              </span>
            }
            valueText={<span className={textStyle}>{`${stepsDone}/${totalActiveSteps}`}</span>}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const Progress = React.memo(ProgressComponent);
