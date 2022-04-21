/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import queryString from 'query-string';

import {
  EuiPageTemplate,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
  EuiSelect,
  EuiLink,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links';

import { ElasticsearchClientInstructions } from '../elasticsearch_client_instructions';
import { ElasticsearchCloudId } from '../elasticsearch_cloud_id';
import { ElasticsearchResources } from '../elasticsearch_resources';

// Replace FormattedMessage with i18n strings

export const ElasticsearchGuide: React.FC = () => {
  const languages = [
    { value: 'dotnet', text: '.Net' },
    { value: 'go', text: 'Go' },
    { value: 'java', text: 'Java' },
    { value: 'javascript', text: 'JavaScript' },
    { value: 'php', text: 'PHP' },
    { value: 'python', text: 'Python' },
    { value: 'ruby', text: 'Ruby' },
    { value: 'rust', text: 'Rust' },
  ];

  const client = queryString.parse(window.location.search).client as string;
  const languageExists = languages.some((language) => language.value === client);
  const [selectedLanguage, setSelectedLanguage] = useState(languageExists ? client : 'java');

  const basicSelectId = useGeneratedHtmlId({ prefix: 'languageSelect' });

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  // TODO: The page keeps the scroll position if being opened from Enterpise Search Overview,
  // This is a temporary solution for demoing
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <EuiPageTemplate>
      <EuiFlexGroup alignItems="flexStart">
        {/* maxWidth is needed to prevent code blocks with long unbreakable strings (Kibana PR Cloud ID) from stretching the column */}
        <EuiFlexItem grow={3} style={{ maxWidth: 800 }}>
          <EuiText>
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchTitle',
                {
                  defaultMessage: 'Getting started with Elasticsearch',
                }
              )}
            </h2>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchDescription',
                {
                  defaultMessage:
                    'Whether you are building a search-powered application, or designing a large-scale search implementation, Elasticsearch provides the low-level tools to create the most relevant and performant search experience.',
                }
              )}
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiSteps
            headingElement="h2"
            steps={[
              {
                title: i18n.translate(
                  'xpack.enterpriseSearch.overview.elasticsearchGuide.connectToElasticsearchTitle',
                  { defaultMessage: 'Connect to Elasticsearch' }
                ),
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.overview.elasticsearchGuide.connectToElasticsearchDescription',
                          {
                            defaultMessage:
                              "Elastic builds and maintains clients in several popular languages and our community has contributed many more. They're easy to work with, feel natural to use, and, just like Elasticsearch, don't limit what you might want to do with them.",
                          }
                        )}
                      </p>
                      <EuiLink href={docLinks.clientsGuide} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchClientsLink',
                          { defaultMessage: 'Learn more about Elasticsearch clients' }
                        )}
                      </EuiLink>
                    </EuiText>

                    <EuiSpacer />

                    <EuiSelect
                      prepend={i18n.translate(
                        'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchClientsSelectLabel',
                        { defaultMessage: 'Select a client' }
                      )}
                      id={basicSelectId}
                      options={languages}
                      value={selectedLanguage}
                      onChange={(e) => onChange(e)}
                      aria-label={i18n.translate(
                        'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchClientsSelectAriaLabel',
                        { defaultMessage: 'Language client' }
                      )}
                    />
                    <EuiSpacer size="m" />
                    <ElasticsearchClientInstructions language={selectedLanguage} />
                  </>
                ),
              },
              {
                title: i18n.translate(
                  'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchExperienceTitle',
                  { defaultMessage: 'Build a search experience with Elasticsearch' }
                ),
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchExperienceDescription',
                          {
                            defaultMessage:
                              'Ready to add an engaging, modern search experience to your application or website? Search UI, Elastic’s JavaScript search framework for building world-class search experiences, was made for the task.',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiSpacer size="l" />
                    <EuiFlexGroup gutterSize="l" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <EuiLink
                            href="https://www.elastic.co/enterprise-search/search-ui"
                            target="_blank"
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchUIMarketingLink',
                              { defaultMessage: 'Learn more about Search UI' }
                            )}
                          </EuiLink>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <EuiLink href="https://github.com/elastic/search-ui" target="_blank">
                            {i18n.translate(
                              'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchUIGitHubLink',
                              { defaultMessage: 'Search UI on GitHub' }
                            )}
                          </EuiLink>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                ),
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <ElasticsearchCloudId />
          <EuiSpacer />
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate>
  );
};
