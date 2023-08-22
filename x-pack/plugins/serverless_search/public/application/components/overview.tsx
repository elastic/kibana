/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  WelcomeBanner,
  IngestData,
  SelectClientPanel,
  OverviewPanel,
  CodeBox,
  LanguageClientPanel,
  InstallClientPanel,
} from '@kbn/search-api-panels';

import React, { useMemo, useState } from 'react';
import type {
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';
import { docLinks } from '../../../common/doc_links';
import { PLUGIN_ID } from '../../../common';
import { useKibanaServices } from '../hooks/use_kibana';
import { API_KEY_PLACEHOLDER, ELASTICSEARCH_URL_PLACEHOLDER } from '../constants';
import { javascriptDefinition } from './languages/javascript';
import { languageDefinitions } from './languages/languages';
import './overview.scss';
import { ApiKeyPanel } from './api_key/api_key';
import { getCodeSnippet, showTryInConsole } from './languages/utils';

export const ElasticsearchOverview = () => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  const [clientApiKey, setClientApiKey] = useState<string>(API_KEY_PLACEHOLDER);
  const { application, cloud, http, userProfile, share } = useKibanaServices();
  const { navigateToApp } = application;

  const elasticsearchURL = useMemo(() => {
    return cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER;
  }, [cloud]);
  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/`);
  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchURL,
    apiKey: clientApiKey,
  };

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchOverviewPage">
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchHeaderSection">
        <EuiText color="ghost">
          <WelcomeBanner userProfile={userProfile} assetBasePath={assetBasePath} />
        </EuiText>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <SelectClientPanel docLinks={docLinks} http={http}>
          {languageDefinitions.map((language, index) => (
            <EuiFlexItem key={`panelItem.${index}`}>
              <LanguageClientPanel
                language={language}
                setSelectedLanguage={setSelectedLanguage}
                isSelectedLanguage={selectedLanguage === language}
                http={http}
                pluginId={PLUGIN_ID}
              />
            </EuiFlexItem>
          ))}
        </SelectClientPanel>
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <InstallClientPanel
          codeSnippet={getCodeSnippet(selectedLanguage, 'installClient', codeSnippetArguments)}
          showTryInConsole={showTryInConsole('installClient')}
          languages={languageDefinitions}
          language={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          http={http}
          pluginId={PLUGIN_ID}
          application={application}
          sharePlugin={share}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.apiKey.description', {
            defaultMessage:
              "You'll need these unique identifiers to securely connect to your Elasticsearch project.",
          })}
          leftPanelContent={<ApiKeyPanel setClientApiKey={setClientApiKey} />}
          links={[
            {
              href: docLinks.securityApis,
              label: i18n.translate('xpack.serverlessSearch.configureClient.basicConfigLabel', {
                defaultMessage: 'Basic configuration',
              }),
            },
          ]}
          title={i18n.translate('xpack.serverlessSearch.apiKey.title', {
            defaultMessage: 'Store your API key and Cloud ID',
          })}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.configureClient.description', {
            defaultMessage: 'Initialize your client with your unique API key and Cloud ID',
          })}
          leftPanelContent={
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getCodeSnippet(
                selectedLanguage,
                'configureClient',
                codeSnippetArguments
              )}
              showTryInConsole={showTryInConsole('configureClient')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              http={http}
              pluginId={PLUGIN_ID}
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
              languages={languageDefinitions}
              codeSnippet={getCodeSnippet(selectedLanguage, 'testConnection', codeSnippetArguments)}
              showTryInConsole={showTryInConsole('testConnection')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              http={http}
              pluginId={PLUGIN_ID}
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
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <IngestData
          codeSnippet={getCodeSnippet(selectedLanguage, 'ingestData', codeSnippetArguments)}
          showTryInConsole={showTryInConsole('ingestData')}
          languages={languageDefinitions}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          http={http}
          docLinks={docLinks}
          pluginId={PLUGIN_ID}
          application={application}
          sharePlugin={share}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.searchQuery.description', {
            defaultMessage:
              "Now you're ready to start experimenting with searching and performing aggregations on your Elasticsearch data.",
          })}
          leftPanelContent={
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getCodeSnippet(
                selectedLanguage,
                'buildSearchQuery',
                codeSnippetArguments
              )}
              showTryInConsole={showTryInConsole('buildSearchQuery')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              http={http}
              pluginId={PLUGIN_ID}
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
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchFooterCardsSection">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <EuiTextColor color="ghost">
                  {i18n.translate('xpack.serverlessSearch.footer.title', {
                    defaultMessage: "What's next?",
                  })}
                </EuiTextColor>
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem>
            <EuiCard
              paddingSize="xl"
              textAlign="left"
              title={i18n.translate('xpack.serverlessSearch.footer.discoverCard.title', {
                defaultMessage: 'Explore and visualize your data in Discover',
              })}
              description={i18n.translate(
                'xpack.serverlessSearch.footer.discoverCard.description',
                {
                  defaultMessage:
                    'With Discover, you can quickly search and filter your data, get information about the structure of the fields, and display your findings in a visualization.',
                }
              )}
              footer={
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiButton color="primary" onClick={() => navigateToApp('discover')}>
                      {i18n.translate('xpack.serverlessSearch.footer.discoverCard.buttonText', {
                        defaultMessage: 'Explore data in Discover',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              image={
                <FooterCardImage
                  iconSrc={`${assetBasePath}discover_icon.png`}
                  backgroundSrc={`${assetBasePath}discover_bg.png`}
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              paddingSize="xl"
              textAlign="left"
              title={i18n.translate('xpack.serverlessSearch.footer.pipelinesCard.title', {
                defaultMessage: 'Transform your data using pipelines',
              })}
              description={i18n.translate(
                'xpack.serverlessSearch.footer.pipelinesCard.description',
                {
                  defaultMessage:
                    'Preprocess data before indexing into Elasticsearch. Remove fields, extract values from text, or enrich your data with machine learning models like ELSER.',
                }
              )}
              footer={
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiButton
                      color="primary"
                      onClick={() =>
                        navigateToApp('management', { path: '/ingest/ingest_pipelines' })
                      }
                    >
                      {i18n.translate('xpack.serverlessSearch.footer.pipelinesCard.buttonText', {
                        defaultMessage: 'Configure your ingest pipelines',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              image={
                <FooterCardImage
                  iconSrc={`${assetBasePath}transform_icon.png`}
                  backgroundSrc={`${assetBasePath}transform_bg.png`}
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              paddingSize="xl"
              textAlign="left"
              title={i18n.translate('xpack.serverlessSearch.footer.searchUI.title', {
                defaultMessage: 'Build a user interface with Search UI',
              })}
              description={i18n.translate('xpack.serverlessSearch.footer.searchUI.description', {
                defaultMessage:
                  'Search UI is a free and open source JavaScript library maintained by Elastic for the fast development of modern, engaging search experiences.',
              })}
              footer={
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiButton color="primary">
                      {i18n.translate('xpack.serverlessSearch.footer.searchUI.buttonText', {
                        defaultMessage: 'Build with Search UI',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              image={
                <FooterCardImage
                  iconSrc={`${assetBasePath}searchui_icon.png`}
                  backgroundSrc={`${assetBasePath}searchui_bg.png`}
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchFooter">
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <FooterIcon
              // TODO: update with real link
              href="https://elastic.co"
              imgSrc={`${assetBasePath}invite_users_icon.png`}
              title={i18n.translate('xpack.serverlessSearch.footer.inviteUsers.title', {
                defaultMessage: 'Invite more users',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FooterIcon
              // TODO: update with real link
              href="https://elastic.co"
              imgSrc={`${assetBasePath}billing_icon.png`}
              title={i18n.translate('xpack.serverlessSearch.footer.billing.title', {
                defaultMessage: 'Billing and usage',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FooterIcon
              href="https://www.elastic.co/community/"
              imgSrc={`${assetBasePath}community_icon.png`}
              title={i18n.translate('xpack.serverlessSearch.footer.community.title', {
                defaultMessage: 'Join the community',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FooterIcon
              // TODO: update with real link
              href="https://www.elastic.co/kibana/feedback"
              imgSrc={`${assetBasePath}feedback_icon.png`}
              title={i18n.translate('xpack.serverlessSearch.footer.feedback.title', {
                defaultMessage: 'Give feedback',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

const FooterCardImage = ({
  iconSrc,
  backgroundSrc,
}: {
  iconSrc: string;
  backgroundSrc: string;
}) => (
  <div className="serverlessSearchFooterCard--wrapper">
    <img src={backgroundSrc} alt="" className="serverlessSearchFooterCard--Background" />
    <EuiImage
      size={250}
      src={iconSrc}
      alt=""
      wrapperProps={{ className: 'serverlessSearchFooterCard--iconWrapper' }}
      style={{ width: 'auto', height: '100%', inlineSize: 'auto' }}
    />
  </div>
);

const FooterIcon = ({ href, imgSrc, title }: { href: string; imgSrc: string; title: string }) => (
  <EuiLink href={href} target="_blank" external={false}>
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem>
        <EuiImage size={120} src={imgSrc} alt="" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="ghost">
          <h5>{title}</h5>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiLink>
);
