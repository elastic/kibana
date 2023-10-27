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
import { docLinks } from '../../../shared/doc_links';
import { ProductCard } from '../product_card';

import { AppSearchProductCard } from './app_search_product_card';
import { WorkplaceSearchProductCard } from './workplace_search_product_card';

export interface EnterpriseSearchProductCardProps {
  hasAppSearchAccess: boolean;
  hasWorkplaceSearchAccess: boolean;
  isWorkplaceSearchAdmin: boolean;
}

export const EnterpriseSearchProductCard = ({
  hasAppSearchAccess,
  hasWorkplaceSearchAccess,
  isWorkplaceSearchAdmin,
}: EnterpriseSearchProductCardProps) => {
  const rightPanelItems: React.ReactNode[] = [];
  if (hasAppSearchAccess) {
    rightPanelItems.push(<AppSearchProductCard hasBorder={false} hasShadow={false} />);
  }
  if (hasWorkplaceSearchAccess) {
    rightPanelItems.push(
      <WorkplaceSearchProductCard
        isWorkplaceSearchAdmin={isWorkplaceSearchAdmin}
        hasBorder={false}
        hasShadow={false}
      />
    );
  }
  return (
    <ProductCard
      description={i18n.translate('xpack.enterpriseSearch.entSearch.productCardDescription', {
        defaultMessage:
          'Standalone applications tailored to simpler, user-friendly and business-focused search experiences.',
      })}
      emptyCta
      cta={i18n.translate('xpack.enterpriseSearch.enterpriseSearchCard.cta', {
        defaultMessage: 'Learn more',
      })}
      url={docLinks.start}
      icon="logoEnterpriseSearch"
      name={ENTERPRISE_SEARCH_PRODUCT_NAME}
      productId={ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID}
      rightPanelItems={rightPanelItems}
    />
  );
};
