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

import React, { useState, useEffect } from 'react';

import { useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';
import { SearchIndicesLogic } from '../search_indices/search_indices_logic';

import { SearchIndexEmptyState } from './empty_state';
import { MethodApi } from './method_api';
import { MethodConnector } from './method_connector';
import { MethodCrawler } from './method_crawler';
import { MethodEs } from './method_es';
import { MethodJson } from './method_json';

import './new_index.scss';

interface ButtonGroupOption {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export const NewIndex: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState({ id: '', label: '' });
  const [methodIsSelected, setMethodIsSelected] = useState(false);

  const { loadSearchEngines } = useActions(SearchIndicesLogic);
  useEffect(() => {
    loadSearchEngines();
  }, []);

  const buttonGroupOptions = [
    {
      id: 'crawler',
      icon: 'globe',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label', {
        defaultMessage: 'Use the web crawler',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.description',
        {
          defaultMessage: 'Index content from your websites',
        }
      ),
    },
    {
      id: 'connector',
      icon: 'package',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.label', {
        defaultMessage: 'Use a data integration',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.description',
        {
          defaultMessage:
            'Index content frrom third-party services such as SharePoint and Google Drive',
        }
      ),
    },
    {
      id: 'api',
      icon: 'visVega',
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.label', {
        defaultMessage: 'Use the API',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.api.description',
        {
          defaultMessage: 'Use a variety of client libraries to add documents to your search index',
        }
      ),
    },
    {
      id: 'customIntegration',
      icon: 'package',
      label: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.customIntegration.label',
        {
          defaultMessage: 'Build a custom data integration',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.customIntegration.description',
        {
          defaultMessage: 'Clone the connector package repo and start customizing.',
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

  const SelectSearchIndexLayout = () => (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ maxWidth: '24rem' }}>
          <EuiPanel hasShadow={false} paddingSize="m" grow={false} color="subdued">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.content.newIndex.selectSearchIndex.title', {
                  defaultMessage: 'Select an ingestion method',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="xs">
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
                  <EuiPanel
                    className={
                      selectedMethod.id === item.id
                        ? 'entSearchNewIndexButtonGroupButton--selected'
                        : 'entSearchNewIndexButtonGroupButton'
                    }
                    hasShadow={false}
                    onClick={() => {
                      handleMethodChange(item.id);
                    }}
                  >
                    <EuiFlexGroup alignItems="center" responsive={false}>
                      <EuiFlexItem grow>
                        <EuiFlexGroup direction="column" gutterSize="none">
                          <EuiFlexItem grow={false}>
                            <EuiTitle size="xs">
                              <h4>{item.label}</h4>
                            </EuiTitle>
                          </EuiFlexItem>
                          <EuiFlexItem grow>
                            <EuiText size="xs">
                              <p>{item.description}</p>
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <div className="rightArrow">
                          <EuiIcon type="arrowRight" color="primary" />
                        </div>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
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
      <SelectSearchIndexLayout />
    </EnterpriseSearchContentPageTemplate>
  );
};
