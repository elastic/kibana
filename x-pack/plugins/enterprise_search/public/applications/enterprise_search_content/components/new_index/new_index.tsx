/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useLocation } from 'react-router-dom';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { ProductFeatures } from '../../../../../common/types';
import { BETA_LABEL } from '../../../shared/constants/labels';
import { KibanaLogic } from '../../../shared/kibana/kibana_logic';
import { parseQueryParams } from '../../../shared/query_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

import { ButtonGroup, ButtonGroupOption } from './button_group';
import { SearchIndexEmptyState } from './empty_state';
import { MethodApi } from './method_api/method_api';
import { MethodConnector } from './method_connector/method_connector';
import { MethodCrawler } from './method_crawler/method_crawler';

const betaBadge = (
  <EuiBadge iconType="beaker">
    <EuiText size="xs">{BETA_LABEL}</EuiText>
  </EuiBadge>
);

const METHOD_BUTTON_GROUP_OPTIONS: Record<INGESTION_METHOD_IDS, ButtonGroupOption> = {
  [INGESTION_METHOD_IDS.crawler]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.description',
      {
        defaultMessage: 'Discover, extract, index, and sync all of your website content',
      }
    ),
    footer: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.footer', {
      defaultMessage: 'No development required',
    }),
    icon: 'globe',
    id: INGESTION_METHOD_IDS.crawler,
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label', {
      defaultMessage: 'Use the web crawler',
    }),
  },
  [INGESTION_METHOD_IDS.native_connector]: {
    badge: betaBadge,
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.nativeConnector.description',
      {
        defaultMessage:
          'Configure a connector to extract, index, and sync all of your content from supported data sources ',
      }
    ),
    footer: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.nativeConnector.footer',
      {
        defaultMessage: 'No development required',
      }
    ),
    icon: 'visVega',
    id: INGESTION_METHOD_IDS.native_connector,
    label: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.nativeConnector.label',
      {
        defaultMessage: 'Use a connector',
      }
    ),
  },
  [INGESTION_METHOD_IDS.api]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.api.description',
      {
        defaultMessage: 'Add documents programmatically by connecting with the API',
      }
    ),
    footer: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.footer', {
      defaultMessage: 'Some development required',
    }),
    icon: 'visVega',
    id: INGESTION_METHOD_IDS.api,
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.label', {
      defaultMessage: 'Use the API',
    }),
  },
  [INGESTION_METHOD_IDS.connector]: {
    badge: betaBadge,
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.description',
      {
        defaultMessage:
          'Use the connector framework to quickly build connectors for custom data sources',
      }
    ),
    footer: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.footer', {
      defaultMessage: 'Development required',
    }),
    icon: 'package',
    id: INGESTION_METHOD_IDS.connector,
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.label', {
      defaultMessage: 'Build a connector',
    }),
  },
};

const getAvailableMethodOptions = (productFeatures: ProductFeatures): ButtonGroupOption[] => {
  return [
    ...(productFeatures.hasWebCrawler
      ? [METHOD_BUTTON_GROUP_OPTIONS[INGESTION_METHOD_IDS.crawler]]
      : []),
    ...(productFeatures.hasNativeConnectors
      ? [METHOD_BUTTON_GROUP_OPTIONS[INGESTION_METHOD_IDS.native_connector]]
      : []),
    METHOD_BUTTON_GROUP_OPTIONS[INGESTION_METHOD_IDS.api],
    ...(productFeatures.hasConnectors
      ? [METHOD_BUTTON_GROUP_OPTIONS[INGESTION_METHOD_IDS.connector]]
      : []),
  ];
};

export const NewIndex: React.FC = () => {
  const { search } = useLocation();
  const { capabilities, productFeatures } = useValues(KibanaLogic);
  const { method: methodParam } = parseQueryParams(search);
  const availableIngestionMethodOptions = getAvailableMethodOptions(productFeatures);

  const initialSelectedMethod =
    availableIngestionMethodOptions.find((option) => option.id === methodParam) ??
    availableIngestionMethodOptions[0];

  const [selectedMethod, setSelectedMethod] = useState<ButtonGroupOption>(initialSelectedMethod);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...baseBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.newIndex.breadcrumb', {
          defaultMessage: 'New search index',
        }),
      ]}
      pageViewTelemetry="New Index"
      isLoading={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.newIndex.pageTitle', {
          defaultMessage: 'New search index',
        }),
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ maxWidth: '24rem' }}>
          <EuiPanel hasShadow={false} paddingSize="m" grow={false} color="subdued">
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.enterpriseSearch.content.newIndex.selectSearchIndex.title', {
                  defaultMessage: 'Select an ingestion method',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.selectSearchIndex.description',
                  {
                    defaultMessage:
                      'Create a search optimized Elasticsearch index by selecting an ingestion method for your use case.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <ButtonGroup
              options={availableIngestionMethodOptions}
              selected={selectedMethod}
              onChange={setSelectedMethod}
            />
            {capabilities.navLinks.integrations && (
              <>
                <EuiSpacer size="xxl" />
                <EuiLinkTo to="/app/integrations" shouldNotCreateHref>
                  {i18n.translate('xpack.enterpriseSearch.content.newIndex.viewIntegrationsLink', {
                    defaultMessage: 'View additional integrations',
                  })}
                </EuiLinkTo>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          {selectedMethod ? (
            <>
              {selectedMethod.id === INGESTION_METHOD_IDS.crawler && <MethodCrawler />}
              {selectedMethod.id === INGESTION_METHOD_IDS.api && <MethodApi />}
              {selectedMethod.id === INGESTION_METHOD_IDS.connector && (
                <MethodConnector isNative={false} />
              )}
              {selectedMethod.id === INGESTION_METHOD_IDS.native_connector && (
                <MethodConnector isNative />
              )}
            </>
          ) : (
            <SearchIndexEmptyState />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
