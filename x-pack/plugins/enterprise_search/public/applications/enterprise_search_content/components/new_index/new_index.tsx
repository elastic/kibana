/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add logic to take a query param to select the correct method when applicable.
 *   This is needed for the use case where a user clicks on an integration method from the
 *   Kibana intgegrations page
 */

import React, { useState } from 'react';

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

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

import { ButtonGroup, ButtonGroupOption } from './button_group';
import { SearchIndexEmptyState } from './empty_state';
import { MethodApi } from './method_api';
import { MethodConnector } from './method_connector';
import { MethodCrawler } from './method_crawler/method_crawler';
import { MethodEs } from './method_es';
import { MethodJson } from './method_json';

const METHOD_BUTTON_GROUP_OPTIONS: ButtonGroupOption[] = [
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.description',
      {
        defaultMessage: 'Discover, extract, index, and sync of all your website content',
      }
    ),
    footer: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.footer', {
      defaultMessage: 'No development required',
    }),
    icon: 'globe',
    id: 'crawler',
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label', {
      defaultMessage: 'Use the web crawler',
    }),
  },
  {
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
    id: 'api',
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.label', {
      defaultMessage: 'Use the API',
    }),
  },
  {
    badge: (
      <EuiBadge iconType="beaker">
        <EuiText size="xs">Technical Preview</EuiText>
      </EuiBadge>
    ),
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
    id: 'connector',
    label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.label', {
      defaultMessage: 'Build a connector',
    }),
  },
];

export const NewIndex: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<ButtonGroupOption>(
    METHOD_BUTTON_GROUP_OPTIONS[0]
  );

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
              options={METHOD_BUTTON_GROUP_OPTIONS}
              selected={selectedMethod}
              onChange={setSelectedMethod}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          {selectedMethod ? (
            <>
              {selectedMethod.id === 'crawler' && <MethodCrawler />}
              {selectedMethod.id === 'api' && <MethodApi />}
              {selectedMethod.id === 'elasticsearch' && <MethodEs />}
              {selectedMethod.id === 'connector' && <MethodConnector />}
              {selectedMethod.id === 'json' && <MethodJson />}
            </>
          ) : (
            <SearchIndexEmptyState />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
