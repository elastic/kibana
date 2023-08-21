/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import {
  ENTERPRISE_SEARCH_PRODUCT_NAME,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
} from '../../../../../common/constants';
import { ProductCard } from '../product_card';

import { AppSearchProductCard } from './app_search_product_card';
import { WorkplaceSearchProductCard } from './workplace_search_product_card';

export const EnterpriseSearchProductCard = () => (
  <ProductCard
    description={i18n.translate('xpack.enterpriseSearch.entSearch.productCardDescription', {
      defaultMessage:
        'Standalone applications tailored to simpler, user-friendly and business-focused search experiences.',
    })}
    emptyCta
    icon="logoEnterpriseSearch"
    name={ENTERPRISE_SEARCH_PRODUCT_NAME}
    productId={ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID}
    rightPanelItems={[
      <AppSearchProductCard hasBorder={false} hasShadow={false} />,
      <WorkplaceSearchProductCard hasBorder={false} hasShadow={false} />,
    ]}
  />
);
