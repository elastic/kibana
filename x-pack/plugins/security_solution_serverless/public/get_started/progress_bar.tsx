/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React from 'react';
import type { ProductTier } from '../../common/product';

import { PROGRESS_TRACKER_LABEL } from './translations';
import { ChangePlanLink } from './welcome_panel/change_plan_link';
import { ProductTierBadge } from './welcome_panel/product_tier_badge';

const ProgressComponent: React.FC<{
  productTier: ProductTier | undefined;
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}> = ({ productTier, totalActiveSteps, totalStepsLeft }) => {
  const stepsDone =
    totalActiveSteps != null && totalStepsLeft != null ? totalActiveSteps - totalStepsLeft : null;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {totalActiveSteps != null && totalStepsLeft != null && stepsDone != null && (
        <EuiFlexItem grow={true}>
          <EuiProgress
            value={stepsDone}
            max={totalActiveSteps}
            size="m"
            label={PROGRESS_TRACKER_LABEL}
            valueText={<>{`${stepsDone}/${totalActiveSteps}`}</>}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <ProductTierBadge productTier={productTier} />
      </EuiFlexItem>
      {productTier && (
        <EuiFlexItem grow={false}>
          <ChangePlanLink productTier={productTier} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const Progress = React.memo(ProgressComponent);
