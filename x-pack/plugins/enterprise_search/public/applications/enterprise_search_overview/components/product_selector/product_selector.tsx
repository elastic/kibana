/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  KibanaPageTemplate,
  KibanaPageTemplateSolutionNavAvatar,
  NO_DATA_PAGE_TEMPLATE_PROPS,
} from '../../../../../../../../src/plugins/kibana_react/public';
import { Chat } from '../../../../../../cloud/public';
import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';
import { SetEnterpriseSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import AppSearchImage from '../../assets/app_search.png';
import WorkplaceSearchImage from '../../assets/workplace_search.png';
import { LicenseCallout } from '../license_callout';
import { ProductCard } from '../product_card';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

import illustration from './lock_light.svg';

interface ProductSelectorProps {
  access: {
    hasAppSearchAccess?: boolean;
    hasWorkplaceSearchAccess?: boolean;
  };
  isWorkplaceSearchAdmin: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  access,
  isWorkplaceSearchAdmin,
}) => {
  const { hasAppSearchAccess, hasWorkplaceSearchAccess } = access;
  const { config } = useValues(KibanaLogic);

  // If Enterprise Search hasn't been set up yet, show all products. Otherwise, only show products the user has access to
  const shouldShowAppSearchCard = !config.host || hasAppSearchAccess;
  const shouldShowWorkplaceSearchCard = !config.host || hasWorkplaceSearchAccess;

  // If Enterprise Search has been set up and the user does not have access to either product, show a message saying they
  // need to contact an administrator to get access to one of the products.
  const shouldShowEnterpriseSearchCards = shouldShowAppSearchCard || shouldShowWorkplaceSearchCard;

  const WORKPLACE_SEARCH_URL = isWorkplaceSearchAdmin
    ? WORKPLACE_SEARCH_PLUGIN.URL
    : WORKPLACE_SEARCH_PLUGIN.NON_ADMIN_URL;

  const productCards = (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="xl">
        {shouldShowAppSearchCard && (
          <EuiFlexItem grow={false}>
            <ProductCard product={APP_SEARCH_PLUGIN} image={AppSearchImage} />
          </EuiFlexItem>
        )}
        {shouldShowWorkplaceSearchCard && (
          <EuiFlexItem grow={false}>
            <ProductCard
              product={WORKPLACE_SEARCH_PLUGIN}
              url={WORKPLACE_SEARCH_URL}
              image={WorkplaceSearchImage}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      {config.host ? <LicenseCallout /> : <SetupGuideCta />}
    </>
  );

  const insufficientAccessMessage = (
    <EuiEmptyPrompt
      icon={<EuiImage size="fullWidth" src={illustration} alt="" />}
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.overview.insufficientPermissionsTitle', {
            defaultMessage: 'Insufficient permissions',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>
            {i18n.translate('xpack.enterpriseSearch.overview.insufficientPermissionsBody', {
              defaultMessage:
                'You don’t have access to view this page. If you feel this may be an error, please contact your administrator.',
            })}
          </p>
        </>
      }
      actions={
        <EuiButton color="primary" fill href="/">
          {i18n.translate('xpack.enterpriseSearch.overview.insufficientPermissionsButtonLabel', {
            defaultMessage: 'Go to the Kibana dashboard',
          })}
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.enterpriseSearch.overview.insufficientPermissionsFooterBody', {
                defaultMessage: 'Go to the Kibana dashboard',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink href={docLinks.kibanaSecurity} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.overview.insufficientPermissionsFooterLinkLabel',
              {
                defaultMessage: 'Read documentation',
              }
            )}
          </EuiLink>
        </>
      }
    />
  );
  return (
    <KibanaPageTemplate {...NO_DATA_PAGE_TEMPLATE_PROPS}>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />
      <TrialCallout />
      <EuiText textAlign="center">
        <KibanaPageTemplateSolutionNavAvatar
          name="Enterprise Search"
          iconType="logoEnterpriseSearch"
          size="xxl"
        />

        <EuiSpacer />

        <h1>
          {i18n.translate('xpack.enterpriseSearch.overview.heading', {
            defaultMessage: 'Welcome to Elastic Enterprise Search',
          })}
        </h1>
        <p>
          {config.host
            ? i18n.translate('xpack.enterpriseSearch.overview.subheading', {
                defaultMessage: 'Add search to your app or organization.',
              })
            : i18n.translate('xpack.enterpriseSearch.overview.setupHeading', {
                defaultMessage: 'Choose a product to set up and get started.',
              })}
        </p>
      </EuiText>
      <EuiSpacer size="xxl" />
      {shouldShowEnterpriseSearchCards ? productCards : insufficientAccessMessage}
      <Chat />
    </KibanaPageTemplate>
  );
};
