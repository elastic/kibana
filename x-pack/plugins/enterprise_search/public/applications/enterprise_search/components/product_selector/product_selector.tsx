/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

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

import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { SetEnterpriseSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import AppSearchImage from '../../assets/app_search.png';
import WorkplaceSearchImage from '../../assets/workplace_search.png';
import { LicenseCallout } from '../license_callout';
import { ProductCard } from '../product_card';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

interface ProductSelectorProps {
  access: {
    hasAppSearchAccess?: boolean;
    hasWorkplaceSearchAccess?: boolean;
  };
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ access }) => {
  const { hasAppSearchAccess, hasWorkplaceSearchAccess } = access;
  const { config } = useValues(KibanaLogic);

  // If Enterprise Search hasn't been set up yet, show all products. Otherwise, only show products the user has access to
  const shouldShowAppSearchCard = !config.host || hasAppSearchAccess;
  const shouldShowWorkplaceSearchCard = !config.host || hasWorkplaceSearchAccess;

  return (
    <EuiPage restrictWidth className="enterpriseSearchOverview">
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />

      <EuiPageBody>
        <TrialCallout />
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
                {config.host
                  ? i18n.translate('xpack.enterpriseSearch.overview.subheading', {
                      defaultMessage: 'Select a product to get started.',
                    })
                  : i18n.translate('xpack.enterpriseSearch.overview.setupHeading', {
                      defaultMessage: 'Choose a product to set up and get started.',
                    })}
              </p>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContentBody>
          <EuiFlexGroup justifyContent="center" gutterSize="xl">
            {shouldShowAppSearchCard && (
              <EuiFlexItem grow={false} className="enterpriseSearchOverview__card">
                <ProductCard product={APP_SEARCH_PLUGIN} image={AppSearchImage} />
              </EuiFlexItem>
            )}
            {shouldShowWorkplaceSearchCard && (
              <EuiFlexItem grow={false} className="enterpriseSearchOverview__card">
                <ProductCard product={WORKPLACE_SEARCH_PLUGIN} image={WorkplaceSearchImage} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xxl" />
          {config.host ? <LicenseCallout /> : <SetupGuideCta />}
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
