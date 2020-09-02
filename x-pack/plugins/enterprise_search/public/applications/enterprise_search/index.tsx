/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SetEnterpriseSearchChrome as SetPageChrome } from '../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../shared/telemetry';

import AppSearchImage from './assets/app_search.png';
import WorkplaceSearchImage from './assets/workplace_search.png';
import { ProductCard } from './components/product_card';

import './index.scss';

export const EnterpriseSearch: React.FC = () => {
  return (
    <EuiPage restrictWidth>
      <SetPageChrome isRoot />
      <SendTelemetry action="viewed" metric="overview" />

      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.enterpriseSearch.overview.heading', {
                  defaultMessage: 'Welcome to Elastic Enterprise Search',
                })}
              </h1>
            </EuiTitle>
            <EuiTitle size="s">
              <p>
                {i18n.translate('xpack.enterpriseSearch.overview.subHeading', {
                  defaultMessage: 'Select a product to get started',
                })}
              </p>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContentBody>
          <div className="enterprise-search-home__content-wrapper">
            <div className="product-cards">
              <ProductCard
                name={i18n.translate('xpack.enterpriseSearch.appSearch.productName', {
                  defaultMessage: 'App Search',
                })}
                description={i18n.translate(
                  'xpack.enterpriseSearch.appSearch.productCardDescription',
                  {
                    defaultMessage:
                      'Elastic App Search provides user-friendly tools to design and deploy a powerful search to your websites or web/mobile applications.',
                  }
                )}
                img={AppSearchImage}
                buttonPath="../app_search"
              />
              <ProductCard
                name={i18n.translate('xpack.enterpriseSearch.workplaceSearch.productName', {
                  defaultMessage: 'Workplace Search',
                })}
                description={i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.productCardDescription',
                  {
                    defaultMessage:
                      "Unify all your team's content in one place, with instant connectivity to popular productivity and collaboration tools.",
                  }
                )}
                img={WorkplaceSearchImage}
                buttonPath="../workplace_search"
              />
            </div>
          </div>
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
