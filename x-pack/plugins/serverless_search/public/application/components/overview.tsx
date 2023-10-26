/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  WelcomeBanner,
  IngestData,
  SelectClientPanel,
  OverviewPanel,
  CodeBox,
  InstallClientPanel,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
} from '@kbn/search-api-panels';

import React, { useMemo, useState } from 'react';
import type {
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';
import { useQuery } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { docLinks } from '../../../common/doc_links';
import { PLUGIN_ID } from '../../../common';
import { useKibanaServices } from '../hooks/use_kibana';
import {
  API_KEY_PLACEHOLDER,
  CLOUD_ID_PLACEHOLDER,
  ELASTICSEARCH_URL_PLACEHOLDER,
} from '../constants';
import { javaDefinition } from './languages/java';
import { languageDefinitions } from './languages/languages';
import { LanguageGrid } from './languages/language_grid';
import './overview.scss';
import { ApiKeyPanel } from './api_key/api_key';

export const ElasticsearchOverview = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(javaDefinition);
  const [clientApiKey, setClientApiKey] = useState<string>(API_KEY_PLACEHOLDER);
  const { application, cloud, http, user, share } = useKibanaServices();

  const { elasticsearchURL, cloudId } = useMemo(() => {
    return {
      elasticsearchURL: cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER,
      cloudId: cloud?.cloudId ?? CLOUD_ID_PLACEHOLDER,
    };
  }, [cloud]);
  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets`);
  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchURL,
    apiKey: clientApiKey,
    cloudId,
  };

  const { data: _data } = useQuery({
    queryKey: ['fetchConnectors'],
    queryFn: () =>
      http.fetch<{ connectors: Connector[] }>('/internal/serverless_search/connectors'),
  });

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchOverviewPage">
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchHeaderSection">
        <EuiText color="ghost">
          <WelcomeBanner user={user} assetBasePath={assetBasePath} />
        </EuiText>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="select-client-section"
      >
        <SelectClientPanel docLinks={docLinks} http={http}>
          <EuiFlexItem>
            <LanguageGrid
              assetBasePath={assetBasePath}
              setSelectedLanguage={setSelectedLanguage}
              languages={languageDefinitions}
              selectedLanguage={selectedLanguage.id}
            />
          </EuiFlexItem>
        </SelectClientPanel>
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="install-client-section"
      >
        <InstallClientPanel
          codeSnippet={getLanguageDefinitionCodeSnippet(
            selectedLanguage,
            'installClient',
            codeSnippetArguments
          )}
          consoleRequest={getConsoleRequest('installClient')}
          languages={languageDefinitions}
          language={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          assetBasePath={assetBasePath}
          application={application}
          sharePlugin={share}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="api-keys-section"
      >
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.apiKey.description', {
            defaultMessage:
              "An API key is a private, unique identifier for authentication and authorization. You'll need an API key to securely connect to your project.",
          })}
          leftPanelContent={<ApiKeyPanel setClientApiKey={setClientApiKey} />}
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.apiKey.title', {
            defaultMessage: 'API Key',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="cloud-details-section"
      >
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.cloudIdDetails.description', {
            defaultMessage:
              "You'll need your Cloud ID and Elasticsearch endpoint to identify and connect to your project.",
          })}
          leftPanelContent={
            <EuiFlexGroup direction="column" gutterSize="xl">
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h6>
                    {i18n.translate('xpack.serverlessSearch.cloudIdDetails.id.title', {
                      defaultMessage: 'Cloud ID',
                    })}
                  </h6>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiThemeProvider colorMode="dark">
                  <EuiPanel paddingSize="xs">
                    <EuiCodeBlock
                      isCopyable
                      fontSize="m"
                      className="serverlessSearchCloudDetailsCopyPanel"
                    >
                      {cloud.cloudId}
                    </EuiCodeBlock>
                  </EuiPanel>
                </EuiThemeProvider>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h6>
                    {i18n.translate('xpack.serverlessSearch.cloudIdDetails.url.title', {
                      defaultMessage: 'Elasticsearch Endpoint',
                    })}
                  </h6>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiThemeProvider colorMode="dark">
                  <EuiPanel paddingSize="xs">
                    <EuiCodeBlock
                      isCopyable
                      transparentBackground
                      fontSize="m"
                      className="serverlessSearchCloudDetailsCopyPanel"
                    >
                      {cloud.elasticsearchUrl}
                    </EuiCodeBlock>
                  </EuiPanel>
                </EuiThemeProvider>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.cloudIdDetails.title', {
            defaultMessage: 'Copy your connection details',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="configure-client-section"
      >
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.configureClient.description', {
            defaultMessage: 'Initialize your client with your unique API key and Cloud ID',
          })}
          leftPanelContent={
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'configureClient',
                codeSnippetArguments
              )}
              consoleRequest={getConsoleRequest('configureClient')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={assetBasePath}
              application={application}
              sharePlugin={share}
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
          ]}
          title={i18n.translate('xpack.serverlessSearch.configureClient.title', {
            defaultMessage: 'Configure your client',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="test-client-section"
      >
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.testConnection.description', {
            defaultMessage:
              'Send a test request to confirm your language client and Elasticsearch instance are up and running.',
          })}
          leftPanelContent={
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'testConnection',
                codeSnippetArguments
              )}
              consoleRequest={getConsoleRequest('testConnection')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={assetBasePath}
              application={application}
              sharePlugin={share}
            />
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.testConnection.title', {
            defaultMessage: 'Test your connection',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="ingest-client-section"
      >
        <IngestData
          codeSnippet={getLanguageDefinitionCodeSnippet(
            selectedLanguage,
            'ingestData',
            codeSnippetArguments
          )}
          consoleRequest={getConsoleRequest('ingestData')}
          languages={languageDefinitions}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          assetBasePath={assetBasePath}
          docLinks={docLinks}
          application={application}
          sharePlugin={share}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        color="subdued"
        bottomBorder="extended"
        data-test-subj="search-client-section"
      >
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.searchQuery.description', {
            defaultMessage:
              "Now you're ready to start experimenting with searching and performing aggregations on your Elasticsearch data.",
          })}
          leftPanelContent={
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'buildSearchQuery',
                codeSnippetArguments
              )}
              consoleRequest={getConsoleRequest('buildSearchQuery')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={assetBasePath}
              application={application}
              sharePlugin={share}
            />
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.searchQuery.title', {
            defaultMessage: 'Build your first search query',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        alignment="top"
        className="serverlessSearchOverviewFooterSection"
        data-test-subj="footer-section"
      >
        <OverviewPanel
          title={i18n.translate('xpack.serverlessSearch.overview.footer.title', {
            defaultMessage: 'Do more with your data',
          })}
          description={i18n.translate('xpack.serverlessSearch.overview.footer.description', {
            defaultMessage:
              "Your Elasticsearch endpoint is set up and you've made some basic queries. Now you're ready to dive deeper into more advanced tools and use cases.",
          })}
          leftPanelContent={<OverviewFooter />}
          links={[]}
          overviewPanelProps={{ color: 'transparent', hasShadow: false }}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

const OverviewFooter = () => {
  const {
    application: { navigateToApp },
    cloud,
  } = useKibanaServices();

  return (
    <EuiFlexGroup gutterSize="xl" direction="column">
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            icon={
              <EuiAvatar
                size="xl"
                color="subdued"
                type="space"
                iconType="discoverApp"
                iconSize="original"
                name="discover"
              />
            }
            titleSize="xs"
            title={i18n.translate('xpack.serverlessSearch.overview.footer.discover.title', {
              defaultMessage: 'Discover',
            })}
            description={
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem>
                  <p>
                    {i18n.translate('xpack.serverlessSearch.overview.footer.discover.description', {
                      defaultMessage:
                        'Search and filter your data, learn how your fields are structured, and create visualizations.',
                    })}
                  </p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="arrowRight" color="subdued" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            onClick={() => navigateToApp('discover')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            icon={
              <EuiAvatar
                size="xl"
                color="subdued"
                type="space"
                iconType="notebookApp"
                iconSize="original"
                name="documentation"
              />
            }
            titleSize="xs"
            title={i18n.translate('xpack.serverlessSearch.overview.footer.documentation.title', {
              defaultMessage: 'Documentation',
            })}
            description={
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem>
                  <p>
                    {i18n.translate(
                      'xpack.serverlessSearch.overview.footer.documentation.description',
                      {
                        defaultMessage:
                          'Learn more with our references, how-to guides, and tutorials.',
                      }
                    )}
                  </p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="arrowRight" color="subdued" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            href={docLinks.gettingStartedSearch}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {cloud.usersAndRolesUrl && (
          <FooterButtonContainer>
            <EuiButtonEmpty iconType="users" href={cloud.usersAndRolesUrl}>
              {i18n.translate('xpack.serverlessSearch.overview.footer.links.inviteUsers', {
                defaultMessage: 'Invite more users',
              })}
            </EuiButtonEmpty>
          </FooterButtonContainer>
        )}
        <FooterButtonContainer>
          <EuiButtonEmpty iconType="heart" href="https://www.elastic.co/community/">
            {i18n.translate('xpack.serverlessSearch.overview.footer.links.community', {
              defaultMessage: 'Join our community',
            })}
          </EuiButtonEmpty>
        </FooterButtonContainer>
        <FooterButtonContainer>
          <EuiButtonEmpty iconType="faceHappy" href={docLinks.kibanaFeedback}>
            {i18n.translate('xpack.serverlessSearch.overview.footer.links.feedback', {
              defaultMessage: 'Give feedback',
            })}
          </EuiButtonEmpty>
        </FooterButtonContainer>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

const FooterButtonContainer: React.FC = ({ children }) => (
  <EuiFlexItem>
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiFlexGroup>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlexItem>
);
