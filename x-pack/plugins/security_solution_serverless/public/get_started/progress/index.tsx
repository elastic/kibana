/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React from 'react';
import type { ProductTier } from '../../../common/product';
import { getTotalCardsNumber } from '../helpers';
import type { CardId } from '../types';
import { ChangePlanLink } from './change_plan_link';
import { ProductTierBadge } from './product_tier_badge';
import { PROGRESS_TRACKER_LABEL } from './translations';

const ProgressComponent: React.FC<{
  finishedCards: Set<CardId>;
  productTier: ProductTier | undefined;
}> = ({ finishedCards, productTier }) => {
  const totalCardsNumber = getTotalCardsNumber();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={true}>
        <EuiProgress
          value={finishedCards.size}
          max={totalCardsNumber}
          size="m"
          label={PROGRESS_TRACKER_LABEL}
          valueText={<>{`${finishedCards.size}/${totalCardsNumber}`}</>}
        />
      </EuiFlexItem>
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
