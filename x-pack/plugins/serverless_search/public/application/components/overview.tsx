/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { PLUGIN_ID } from '../../../common';
import { useKibanaServices } from '../hooks/use_kibana';
import { CodeBox } from './code_box';
import { javascriptDefinition } from './languages/javascript';
import { languageDefinitions } from './languages/languages';
import { LanguageDefinition } from './languages/types';
import { InstallClientPanel } from './overview_panels/install_client';
import { OverviewPanel } from './overview_panels/overview_panel';
import './overview.scss';
import { IngestData } from './overview_panels/ingest_data';

export const ElasticsearchOverview = () => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  const { http } = useKibanaServices();

  return (
    <EuiPageTemplate offset={0} grow restrictWidth>
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchHeaderSection">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" direction="column" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiTitle className="serverlessSearchHeaderTitle" size="l">
                  <h1>
                    {i18n.translate('xpack.serverlessSearch.header.title', {
                      defaultMessage: 'Get started with Elasticsearch',
                    })}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  {i18n.translate('xpack.serverlessSearch.header.description', {
                    defaultMessage:
                      "Set up your programming language client, ingest some data, and you'll be ready to start searching within minutes.",
                  })}
                </EuiText>
                <EuiSpacer size="xxl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiImage
              alt=""
              src={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/serverless_header.png`)}
              size="554px"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <InstallClientPanel language={selectedLanguage} setSelectedLanguage={setSelectedLanguage} />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.configureClient.description', {
            defaultMessage: 'Initialize your client with your unique API key and Cloud ID',
          })}
          leftPanelContent={
            <CodeBox
              code="configureClient"
              languages={languageDefinitions}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          }
          links={[
            ...(selectedLanguage.basicConfig
              ? [
                  {
                    href: selectedLanguage.basicConfig,
                    label: i18n.translate(
                      'xpack.serverlessSearch.configureClient.basicConfigLabel',
                      {
                        defaultMessage: 'Basic configuration',
                      }
                    ),
                  },
                ]
              : []),
            ...(selectedLanguage.advancedConfig
              ? [
                  {
                    href: selectedLanguage.advancedConfig,
                    label: i18n.translate(
                      'xpack.serverlessSearch.configureClient.advancedConfigLabel',
                      {
                        defaultMessage: 'Advanced configuration',
                      }
                    ),
                  },
                ]
              : []),
          ]}
          title={i18n.translate('xpack.serverlessSearch.configureClient.title', {
            defaultMessage: 'Configure your client',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.testConnection.description', {
            defaultMessage:
              'Send a test request to confirm your language client and Elasticsearch instance are up and running.',
          })}
          leftPanelContent={
            <CodeBox
              code="testConnection"
              languages={languageDefinitions}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.testConnection.title', {
            defaultMessage: 'Test your connection',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <IngestData selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage} />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.searchQuery.description', {
            defaultMessage:
              "Now you're ready to start experimenting with searching and performing aggregations on your Elasticsearch data.",
          })}
          leftPanelContent={
            <CodeBox
              code="buildSearchQuery"
              languages={languageDefinitions}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.searchQuery.title', {
            defaultMessage: 'Build your first search query',
          })}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
