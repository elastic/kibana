/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';
import { ProductTier } from '../../../common/product';

const ProductTierBadgeComponent = ({ productTier }: { productTier: ProductTier | undefined }) =>
  productTier ? (
    <EuiBadge
      color="warning"
      css={css`
        font-size: 14px;
      `}
    >
      <strong>
        {productTier === ProductTier.essentials && (
          <FormattedMessage
            id="xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.product.tier.essential"
            defaultMessage="Essential"
          />
        )}
        {productTier === ProductTier.complete && (
          <FormattedMessage
            id="xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.product.tier.complete"
            defaultMessage="Complete"
          />
        )}
      </strong>
    </EuiBadge>
  ) : null;

export const ProductTierBadge = React.memo(ProductTierBadgeComponent);
