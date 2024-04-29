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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

import React, { useEffect, useMemo, useState } from 'react';
import type {
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';
import { useLocation } from 'react-router-dom';
import { CloudDetailsPanel, PipelinePanel } from '@kbn/search-api-panels';
import { docLinks } from '../../../common/doc_links';
import { useKibanaServices } from '../hooks/use_kibana';
import { useAssetBasePath } from '../hooks/use_asset_base_path';
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
import { ConnectorIngestionPanel } from './connectors_ingestion';
import { PipelineButtonOverview } from './pipeline_button_overview';
import { SelectClientCallouts } from './select_client_callouts';

export const ElasticsearchOverview = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(javaDefinition);
  const [clientApiKey, setClientApiKey] = useState<string>(API_KEY_PLACEHOLDER);
  const { application, cloud, user, share, console: consolePlugin } = useKibanaServices();
  const { elasticsearchURL, cloudId } = useMemo(() => {
    return {
      elasticsearchURL: cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER,
      cloudId: cloud?.cloudId ?? CLOUD_ID_PLACEHOLDER,
    };
  }, [cloud]);
  const assetBasePath = useAssetBasePath();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash]);
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchURL,
    apiKey: clientApiKey,
    cloudId,
  };

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
        <SelectClientPanel
          docLinks={docLinks}
          callout={<SelectClientCallouts />}
          application={application}
          consolePlugin={consolePlugin}
          sharePlugin={share}
        >
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
        <CloudDetailsPanel cloudId={cloud.cloudId} elasticsearchUrl={cloud.elasticsearchUrl} />
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
        id="ingestData"
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
          consolePlugin={consolePlugin}
          sharePlugin={share}
          additionalIngestionPanel={<ConnectorIngestionPanel assetBasePath={assetBasePath} />}
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
              consolePlugin={consolePlugin}
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
        color="subdued"
        bottomBorder="extended"
        data-test-subj="pipeline-client-section"
      >
        <OverviewPanel
          description={
            <FormattedMessage
              id="xpack.serverlessSearch.pipeline.description"
              defaultMessage="Use {ingestPipelinesLink} to preprocess your data before it's indexed into Elasticsearch, which is often much easier than post-processing. Use any combination of ingest processors to add, delete, or transform fields in your documents."
              values={{
                ingestPipelinesLink: (
                  <EuiLink
                    data-test-subj="serverlessSearchElasticsearchOverviewIngestPipelinesLink"
                    href={docLinks.ingestionPipelines}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.serverlessSearch.pipeline.description.ingestPipelinesLink.link',
                      {
                        defaultMessage: 'ingest pipelines',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          }
          leftPanelContent={
            <PipelinePanel
              clusterImage={`${assetBasePath}/cluster.svg`}
              cutImage={`${assetBasePath}/cut.svg`}
              reporterImage={`${assetBasePath}/reporter.svg`}
            />
          }
          links={[]}
          title={i18n.translate('xpack.serverlessSearch.pipeline.title', {
            defaultMessage: 'Transform and enrich your data',
          })}
          children={<PipelineButtonOverview />}
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
        {embeddableConsole}
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
            target="_blank"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {cloud.usersAndRolesUrl && (
          <FooterButtonContainer>
            <EuiButtonEmpty
              data-test-subj="serverlessSearchOverviewFooterInviteMoreUsersButton"
              iconType="users"
              href={cloud.usersAndRolesUrl}
            >
              {i18n.translate('xpack.serverlessSearch.overview.footer.links.inviteUsers', {
                defaultMessage: 'Invite more users',
              })}
            </EuiButtonEmpty>
          </FooterButtonContainer>
        )}
        <FooterButtonContainer>
          <EuiButtonEmpty
            data-test-subj="serverlessSearchOverviewFooterJoinOurCommunityButton"
            iconType="heart"
            href="https://www.elastic.co/community/"
          >
            {i18n.translate('xpack.serverlessSearch.overview.footer.links.community', {
              defaultMessage: 'Join our community',
            })}
          </EuiButtonEmpty>
        </FooterButtonContainer>
        <FooterButtonContainer>
          <EuiButtonEmpty
            data-test-subj="serverlessSearchOverviewFooterGiveFeedbackButton"
            iconType="faceHappy"
            href={docLinks.kibanaFeedback}
          >
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
