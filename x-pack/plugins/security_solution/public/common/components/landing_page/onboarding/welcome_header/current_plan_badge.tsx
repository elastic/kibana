/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

import classnames from 'classnames';
import { PRODUCT_TIER_ESSENTIAL, PRODUCT_TIER_COMPLETE } from './translations';
import { ProductTier } from '../configs';
import { useCurrentPlanBadgeStyles } from '../styles/current_plan_badge.styles';

const PRODUCT_TIER_TRANSLATES: { [key: string]: string } = {
  [ProductTier.essentials]: PRODUCT_TIER_ESSENTIAL,
  [ProductTier.complete]: PRODUCT_TIER_COMPLETE,
};

const CurrentPlanBadgeComponent = ({ currentPlan }: { currentPlan: string | undefined }) => {
  const { wrapperStyles, textStyles } = useCurrentPlanBadgeStyles();
  const wrapperClassNames = classnames('eui-alignMiddle', wrapperStyles);
  return currentPlan ? (
    <EuiBadge color="warning" className={wrapperClassNames} data-test-subj="product-tier-badge">
      <strong className={textStyles}>{PRODUCT_TIER_TRANSLATES[currentPlan] ?? currentPlan}</strong>
    </EuiBadge>
  ) : null;
};

export const CurrentPlanBadge = React.memo(CurrentPlanBadgeComponent);
