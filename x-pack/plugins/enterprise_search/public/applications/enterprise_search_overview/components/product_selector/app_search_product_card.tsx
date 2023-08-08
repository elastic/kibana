/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { ProductCard } from '../product_card';

export interface AppSearchProductCardProps {
  hasBorder: boolean;
  hasShadow: boolean;
}

export const AppSearchProductCard: React.FC<AppSearchProductCardProps> = ({
  hasBorder = true,
  hasShadow = true,
}) => (
  <ProductCard
    hasBorder={hasBorder}
    hasShadow={hasShadow}
    description={i18n.translate('xpack.enterpriseSearch.appSearch.productCardDescription', {
      defaultMessage:
        'A bespoke solution for apps and websites, providing the tools you need to design, implement, and effectively manage those user-facing search experiences.',
    })}
    emptyCta
    cta={i18n.translate('xpack.enterpriseSearch.appSearch.cta', {
      defaultMessage: 'Explore',
    })}
    icon="logoAppSearch"
    name={APP_SEARCH_PLUGIN.NAME}
    productId={APP_SEARCH_PLUGIN.ID}
    url={APP_SEARCH_PLUGIN.URL}
  />
);
