/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import type { ProductTier } from '../../common/product';

import { PROGRESS_TRACKER_LABEL } from './translations';

const ProgressComponent: React.FC<{
  productTier: ProductTier | undefined;
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}> = ({ productTier, totalActiveSteps, totalStepsLeft }) => {
  const stepsDone =
    totalActiveSteps != null && totalStepsLeft != null ? totalActiveSteps - totalStepsLeft : null;
  const { euiTheme } = useEuiTheme();

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
                <span
                  css={css`
                    font-size: 10.5px;
                    font-weight: ${euiTheme.font.weight.bold}}};
                    text-transform: uppercase;
                  `}
                >
                  {PROGRESS_TRACKER_LABEL}
                </span>
                <EuiSpacer size="s" />
              </span>
            }
            valueText={<>{`${stepsDone}/${totalActiveSteps}`}</>}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const Progress = React.memo(ProgressComponent);
