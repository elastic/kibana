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
import React, { useState } from 'react';
import { docLinks } from '../../../common/doc_links';
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
import { SelectClientPanel } from './overview_panels/select_client';
import { ApiKeyPanel } from './api_key/api_key';
import { LanguageClientPanel } from './overview_panels/language_client_panel';

export const ElasticsearchOverview = () => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  const {
    http,
    userProfile,
    application: { navigateToApp },
  } = useKibanaServices();
  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/`);

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchOverviewPage">
      <EuiPageTemplate.Section alignment="top" className="serverlessSearchHeaderSection">
        <EuiText color="ghost">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {/* Reversing column direction here so screenreaders keep h1 as the first element */}
              <EuiFlexGroup justifyContent="flexStart" direction="columnReverse" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle className="serverlessSearchHeaderTitle" size="s">
                    <h1>
                      {i18n.translate('xpack.serverlessSearch.header.title', {
                        defaultMessage: 'Get started with Elasticsearch',
                      })}
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxxs">
                    <h2>
                      {i18n.translate('xpack.serverlessSearch.header.greeting.title', {
                        defaultMessage: 'Hi {name}!',
                        values: { name: userProfile.user.full_name || userProfile.user.username },
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiText>
                {i18n.translate('xpack.serverlessSearch.header.description', {
                  defaultMessage:
                    "Set up your programming language client, ingest some data, and you'll be ready to start searching within minutes.",
                })}
              </EuiText>
              <EuiSpacer size="xxl" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiImage alt="" src={`${assetBasePath}serverless_header.png`} size="554px" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <SelectClientPanel>
          {languageDefinitions.map((language, index) => (
            <EuiFlexItem key={`panelItem.${index}`}>
              <LanguageClientPanel
                language={language}
                setSelectedLanguage={setSelectedLanguage}
                isSelectedLanguage={selectedLanguage === language}
              />
            </EuiFlexItem>
          ))}
        </SelectClientPanel>
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <InstallClientPanel language={selectedLanguage} setSelectedLanguage={setSelectedLanguage} />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          description={i18n.translate('xpack.serverlessSearch.apiKey.description', {
            defaultMessage:
              "You'll need these unique identifiers to securely connect to your Elasticsearch project.",
          })}
          leftPanelContent={<ApiKeyPanel />}
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
