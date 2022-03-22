/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

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
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ElasticsearchCloudId } from '../elasticsearch_cloud_id';
import { ElasticsearchResources } from '../elasticsearch_resources';

import { LanguageInstructions } from './language_instructions';

// Replace FormattedMessage with i18n strings

export const ElasticsearchGuide: React.FC = () => {
  const languages = [
    { value: 'java', text: 'Java' },
    { value: 'javascript', text: 'JavaScript' },
    { value: 'ruby', text: 'Ruby' },
    { value: 'go', text: 'Go' },
    { value: 'dotnet', text: '.Net' },
    { value: 'php', text: 'PHP' },
    { value: 'perl', text: 'Perl' },
    { value: 'python', text: 'Python' },
    { value: 'rust', text: 'Rust' },
  ];

  const client = queryString.parse(window.location.search).client;
  const languageExists = languages.some((language) => language.value === client);
  const [selectedLanguage, setSelectedLanguage] = useState(
    languageExists ? (client as string) : 'java'
  );

  const basicSelectId = useGeneratedHtmlId({ prefix: 'languageSelect' });

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  return (
    <EuiPageTemplate pageHeader={{ pageTitle: 'Elasticsearch' }}>
      <ElasticsearchCloudId />
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchTitle', {
            defaultMessage: 'Getting started with Elasticsearch',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={4}>
          <EuiText>
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
        </EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={3}>
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
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiSpacer size="xs" />
                    <EuiLink href="#" external>
                      {i18n.translate(
                        'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchClientsLink',
                        { defaultMessage: 'Learn more about Elasticsearch clients' }
                      )}
                    </EuiLink>
                    <EuiSpacer size="l" />
                    <EuiSpacer size="xs" />
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
                    <LanguageInstructions language={selectedLanguage} />
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
                        <EuiLink href="#" external>
                          {i18n.translate(
                            'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchUIMarketingLink',
                            { defaultMessage: 'Learn more about Search UI' }
                          )}
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink href="#" external>
                          {i18n.translate(
                            'xpack.enterpriseSearch.overview.elasticsearchGuide.elasticsearchSearchUIGitHubLink',
                            { defaultMessage: 'Search UI on GitHub' }
                          )}
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                ),
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate>
  );
};
