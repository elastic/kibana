/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { ProductCard } from '../product_card';

export interface WorkplaceSearchProductCardProps {
  hasBorder: boolean;
  hasShadow: boolean;
  isWorkplaceSearchAdmin: boolean;
}

export const WorkplaceSearchProductCard: React.FC<WorkplaceSearchProductCardProps> = ({
  hasBorder = true,
  hasShadow = true,
  isWorkplaceSearchAdmin,
}) => (
  <ProductCard
    hasBorder={hasBorder}
    hasShadow={hasShadow}
    description={i18n.translate('xpack.enterpriseSearch.workplaceSearch.productCardDescription', {
      defaultMessage:
        'Tailored for internal business teams, Workplace Search enables instant connectivity to popular productivity tools and third-party sources into a single, unified platform.',
    })}
    emptyCta
    cta={i18n.translate('xpack.enterpriseSearch.workplaceSearch.cta', {
      defaultMessage: 'Explore',
    })}
    icon="logoWorkplaceSearch"
    name={WORKPLACE_SEARCH_PLUGIN.NAME}
    productId={WORKPLACE_SEARCH_PLUGIN.ID}
    url={
      isWorkplaceSearchAdmin ? WORKPLACE_SEARCH_PLUGIN.URL : WORKPLACE_SEARCH_PLUGIN.NON_ADMIN_URL
    }
  />
);
