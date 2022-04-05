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
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

import { SearchIndexEmptyState } from './empty_state';
import { MethodApi } from './method_api';
import { MethodConnector } from './method_connector';
import { MethodCrawler } from './method_crawler';
import { MethodEs } from './method_es';
import { MethodJson } from './method_json';

interface CardLabelProps {
  title: string;
  description: React.ReactNode;
  icon: string;
}

interface ButtonGroupOption {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export const NewIndex: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState({ id: '', label: '' });
  const [methodIsSelected, setMethodIsSelected] = useState(false);

  const buttonGroupOptions = [
    {
      id: 'crawler',
      icon: 'globe',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label', {
        defaultMessage: 'Web crawler',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.description',
        {
          defaultMessage: 'Automatically index content from your website or knowlege base',
        }
      ),
    },
    {
      id: 'api',
      icon: 'visVega',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.label', {
        defaultMessage: 'API',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.api.description',
        {
          defaultMessage: 'Use a variety of client libraries to add documents to your search index',
        }
      ),
    },
    {
      id: 'connector',
      icon: 'package',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.label', {
        defaultMessage: 'Connector',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.description',
        {
          defaultMessage:
            'Ingest data from content sources like GitHub, Google Drive or SharePoint',
        }
      ),
    },
    {
      id: 'elasticsearch',
      icon: 'logoElasticsearch',
      label: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.elasticsearch.label',
        {
          defaultMessage: 'Elasticsearch index',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.elasticsearch.description',
        {
          defaultMessage: 'Connect to an existing Elasticsearch index',
        }
      ),
    },
    {
      id: 'json',
      icon: 'document',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.json.label', {
        defaultMessage: 'Paste or upload JSON',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.json.description',
        {
          defaultMessage: 'Manually upload JSON files',
        }
      ),
    },
  ] as ButtonGroupOption[];

  const handleMethodChange = (val: string) => {
    const selected = buttonGroupOptions.find((b) => b.id === val) as ButtonGroupOption;
    setSelectedMethod(selected);
    setMethodIsSelected(true);
  };

  const NewSearchIndexLayout = () => (
    <>
      {selectedMethod.id === 'crawler' && <MethodCrawler />}
      {selectedMethod.id === 'api' && <MethodApi />}
      {selectedMethod.id === 'elasticsearch' && <MethodEs />}
      {selectedMethod.id === 'connector' && <MethodConnector />}
      {selectedMethod.id === 'json' && <MethodJson />}
    </>
  );

  const CardLabel: React.FC<CardLabelProps> = ({ title, description, icon }) => (
    <span style={{ minWidth: '13rem', width: 'calc(100% - .5rem)', display: 'inline-block' }}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} color="text" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{description}</EuiText>
    </span>
  );

  const SelectSearchIndexLayout = () => (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ maxWidth: '22rem' }}>
          <EuiPanel hasShadow={false} paddingSize="none" grow={false}>
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.content.newIndex.selectSearchIndex.title', {
                  defaultMessage: 'Create a search index',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.selectSearchIndex.description',
                  {
                    defaultMessage:
                      'Add your content to Enterprise Search by creating a search index.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
              {buttonGroupOptions.map((item) => (
                <EuiFlexItem style={{ width: 'calc(100% - .5rem)' }}>
                  <EuiCheckableCard
                    id={`method_${item.id}`}
                    label={
                      <CardLabel
                        title={item.label}
                        description={item.description}
                        icon={item.icon}
                      />
                    }
                    value={item.id}
                    name="method_options"
                    onChange={() => handleMethodChange(item.id)}
                    checked={selectedMethod.id === item.id}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiLink href="#" target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.selectSearchIndex.learnMore.buttonText',
                {
                  defaultMessage: 'Learn more about search indices',
                }
              )}
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          {methodIsSelected ? <NewSearchIndexLayout /> : <SearchIndexEmptyState />}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...baseBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.searchIndices.newIndex.breadcrumb', {
          defaultMessage: 'New search index',
        }),
      ]}
      pageViewTelemetry="New Index"
      isLoading={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.searchIndices.searchIndices.pageTitle', {
          defaultMessage: 'New search index',
        }),
      }}
    >
      <SelectSearchIndexLayout />
    </EnterpriseSearchContentPageTemplate>
  );
};
