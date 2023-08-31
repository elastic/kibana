/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ProductTier } from '../../../common/product';
import { PRODUCT_TIER_ESSENTIAL, PRODUCT_TIER_COMPLETE } from './translations';

const ProductTierBadgeComponent = ({ productTier }: { productTier: ProductTier | undefined }) => {
  const { euiTheme } = useEuiTheme();
  return productTier ? (
    <EuiBadge
      color="warning"
      className="eui-alignMiddle"
      css={css`
        font-size: ${euiTheme.size.m};
        line-height: ${euiTheme.size.m};
      `}
    >
      <strong>
        {productTier === ProductTier.essentials && PRODUCT_TIER_ESSENTIAL}
        {productTier === ProductTier.complete && PRODUCT_TIER_COMPLETE}
      </strong>
    </EuiBadge>
  ) : null;
};

export const ProductTierBadge = React.memo(ProductTierBadgeComponent);
