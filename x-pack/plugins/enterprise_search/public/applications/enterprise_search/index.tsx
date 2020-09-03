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
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../common/constants';

import { SetEnterpriseSearchChrome as SetPageChrome } from '../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../shared/telemetry';

import AppSearchImage from './assets/app_search.png';
import WorkplaceSearchImage from './assets/workplace_search.png';
import { ProductCard } from './components/product_card';

import './index.scss';

export const EnterpriseSearch: React.FC = () => {
  return (
    <EuiPage restrictWidth className="enterpriseSearchOverview">
      <SetPageChrome isRoot />
      <SendTelemetry action="viewed" metric="overview" />

      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection className="enterpriseSearchOverview__header">
            <EuiTitle size="l">
              <h1 className="enterpriseSearchOverview__heading">
                {i18n.translate('xpack.enterpriseSearch.overview.heading', {
                  defaultMessage: 'Welcome to Elastic Enterprise Search',
                })}
              </h1>
            </EuiTitle>
            <EuiTitle size="s">
              <p className="enterpriseSearchOverview__subheading">
                {i18n.translate('xpack.enterpriseSearch.overview.subheading', {
                  defaultMessage: 'Select a product to get started',
                })}
              </p>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContentBody>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
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
                buttonPath={APP_SEARCH_PLUGIN.URL}
              />
            </EuiFlexItem>
            <EuiFlexItem>
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
                buttonPath={WORKPLACE_SEARCH_PLUGIN.URL}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
