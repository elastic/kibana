/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CurrentPlanBadge } from './current_plan_badge';
import { ProductTier } from '../configs';

describe('CurrentPlanBadge', () => {
  it('renders nothing when productTier is undefined', () => {
    const { container } = render(<CurrentPlanBadge currentPlan={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the badge with the correct text when ProductTier is essential', () => {
    const { getByTestId } = render(<CurrentPlanBadge currentPlan={ProductTier.essentials} />);
    const badge = getByTestId('product-tier-badge');
    expect(badge).toHaveTextContent('Essential');
  });

  it('renders the badge with the correct text when ProductTier is complete', () => {
    const { getByTestId } = render(<CurrentPlanBadge currentPlan={ProductTier.complete} />);
    const badge = getByTestId('product-tier-badge');
    expect(badge).toHaveTextContent('Complete');
  });
});
