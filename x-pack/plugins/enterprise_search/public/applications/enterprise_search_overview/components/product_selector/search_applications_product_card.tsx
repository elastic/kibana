/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { APPLICATIONS_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import searchAppLogo from '../../assets/search_applications_logo.svg';
import { ProductCard } from '../product_card';

export const SearchApplicationsProductCard = () => (
  <ProductCard
    cta={i18n.translate('xpack.enterpriseSearch.searchApplications.productCardCTA', {
      defaultMessage: 'Explore Search Applications',
    })}
    description={i18n.translate('xpack.enterpriseSearch.searchApplications.description', {
      defaultMessage:
        'Search Applications help make your Elasticsearch data easily searchable for end users',
    })}
    emptyCta
    features={[
      i18n.translate('xpack.enterpriseSearch.searchApplications.features.queries', {
        defaultMessage: 'Build queries using search templates and DLS',
      }),
      i18n.translate('xpack.enterpriseSearch.searchApplications.features.indices', {
        defaultMessage: 'Combine your Elasticsearch indices',
      }),
      i18n.translate('xpack.enterpriseSearch.searchApplications.features.docsExplorer', {
        defaultMessage: 'Easily preview your search results',
      }),
      i18n.translate('xpack.enterpriseSearch.searchApplications.features.api', {
        defaultMessage: 'Elasticsearch Search Application API',
      }),
    ]}
    icon={searchAppLogo}
    iconSize="l"
    name={APPLICATIONS_PLUGIN.NAV_TITLE}
    productId={APPLICATIONS_PLUGIN.ID}
    resourceLinks={[
      {
        label: i18n.translate(
          'xpack.enterpriseSearch.searchApplications.resources.gettingStartedLabel',
          {
            defaultMessage: 'Getting started with Search Applications',
          }
        ),
        to: docLinks.searchApplications,
      },
    ]}
    url={APPLICATIONS_PLUGIN.URL}
  />
);
