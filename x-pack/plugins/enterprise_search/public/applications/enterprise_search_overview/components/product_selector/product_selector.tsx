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
  EuiTitle,
} from '@elastic/eui';
import { Chat } from '@kbn/cloud-plugin/public';
import { i18n } from '@kbn/i18n';

import {
  APP_SEARCH_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../../common/constants';
import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';
import { SetEnterpriseSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { EnterpriseSearchOverviewPageTemplate } from '../layout';
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
      <AddContentEmptyPrompt
        title={i18n.translate('xpack.enterpriseSearch.overview.emptyPromptTitle', {
          defaultMessage: 'A new start for search',
        })}
        buttonLabel={i18n.translate('xpack.enterpriseSearch.overview.emptyPromptButtonLabel', {
          defaultMessage: 'Create an Elasticsearch index',
        })}
      />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiTitle>
        <h3>
          {i18n.translate('xpack.enterpriseSearch.overview.productSelector.title', {
            defaultMessage: 'Search experiences for every use case',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xl" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <ProductCard data-test-subj="productCard-elasticsearch" product={ELASTICSEARCH_PLUGIN} />
        </EuiFlexItem>
        {shouldShowAppSearchCard && (
          <EuiFlexItem>
            <ProductCard data-test-subj="productCard-appSearch" product={APP_SEARCH_PLUGIN} />
          </EuiFlexItem>
        )}
        {shouldShowWorkplaceSearchCard && (
          <EuiFlexItem>
            <ProductCard data-test-subj="productCard-workplaceSearch" product={{ ...WORKPLACE_SEARCH_PLUGIN, URL: WORKPLACE_SEARCH_URL }} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {!config.host && <SetupGuideCta />}
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
    <EnterpriseSearchOverviewPageTemplate
      restrictWidth
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.overview.pageTitle', {
          defaultMessage: 'Welcome to Enterprise Search',
        }),
      }}
    >
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />
      <TrialCallout />
      {shouldShowEnterpriseSearchCards ? productCards : insufficientAccessMessage}
      <Chat />
    </EnterpriseSearchOverviewPageTemplate>
  );
};
