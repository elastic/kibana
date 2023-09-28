/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { APPLICATIONS_PLUGIN } from '../../../../../common/constants';
import searchAppLogo from '../../assets/search_applications_logo.svg';
import { ProductCard } from '../product_card';

export interface SearchApplicationProductCardProps {
  hasBorder: boolean;
  hasShadow: boolean;
}

export const SearchApplicationsProductCard: React.FC<SearchApplicationProductCardProps> = ({
  hasBorder = true,
  hasShadow = true,
}) => (
  <ProductCard
    hasBorder={hasBorder}
    hasShadow={hasShadow}
    cta={i18n.translate('xpack.enterpriseSearch.searchApplications.productCardCTA', {
      defaultMessage: 'Explore Search Applications',
    })}
    description={i18n.translate('xpack.enterpriseSearch.searchApplications.description', {
      defaultMessage:
        'Search Applications help make your Elasticsearch data easily searchable for end users',
    })}
    emptyCta
    icon={searchAppLogo}
    iconSize="l"
    name={APPLICATIONS_PLUGIN.NAV_TITLE}
    productId={APPLICATIONS_PLUGIN.ID}
    url={APPLICATIONS_PLUGIN.URL}
  />
);
