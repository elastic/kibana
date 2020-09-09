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

import { IInitialAppData } from '../../../common/types';
import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../common/constants';

import { SetEnterpriseSearchChrome as SetPageChrome } from '../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../shared/telemetry';

import { ProductCard } from './components/product_card';

import AppSearchImage from './assets/app_search.png';
import WorkplaceSearchImage from './assets/workplace_search.png';
import './index.scss';

export const EnterpriseSearch: React.FC<IInitialAppData> = ({ access = {} }) => {
  const { hasAppSearchAccess, hasWorkplaceSearchAccess } = access;

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
          <EuiFlexGroup justifyContent="center" gutterSize="xl">
            {hasAppSearchAccess && (
              <EuiFlexItem grow={false} className="enterpriseSearchOverview__card">
                <ProductCard product={APP_SEARCH_PLUGIN} image={AppSearchImage} />
              </EuiFlexItem>
            )}
            {hasWorkplaceSearchAccess && (
              <EuiFlexItem grow={false} className="enterpriseSearchOverview__card">
                <ProductCard product={WORKPLACE_SEARCH_PLUGIN} image={WorkplaceSearchImage} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
