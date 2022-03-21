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
  useGeneratedHtmlId,
} from '@elastic/eui';

import { ElasticsearchResources } from '../elasticsearch_resources';

import { LanguageInstructions } from './language_instructions';

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
      Content goes here
      <EuiText>
        <h2>Getting started with Elasticsearch</h2>
        <p>
          Whether you are building a search-powered application, or designing a large-scale search
          implementation, Elasticsearch provides the low-level tools to create the most relevant and
          performant search experience.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={3}>
          <EuiSteps
            headingElement="h2"
            steps={[
              {
                title: 'Connect to Elasticsearch',
                children: (
                  <>
                    <EuiText>
                      <p>
                        Elastic builds and maintains clients in several popular languages and our
                        community has contributed many more. They're easy to work with, feel natural
                        to use, and, just like Elasticsearch, don't limit what you might want to do
                        with them.
                      </p>
                    </EuiText>
                    <EuiSpacer />
                    <EuiLink href="#" external>
                      Learn more about Elasticsearch clients
                    </EuiLink>
                    <EuiSelect
                      prepend="Select a client"
                      id={basicSelectId}
                      options={languages}
                      value={selectedLanguage}
                      onChange={(e) => onChange(e)}
                      aria-label="Use aria labels when no actual label is in use"
                    />
                    <LanguageInstructions language={selectedLanguage} />
                  </>
                ),
              },
              {
                title: 'Build a search experience with Elasticsearch',
                children: (
                  <>
                    <EuiText>
                      <p>
                        Ready to add an engaging, modern search experience to your application or
                        website? Search UI, Elastic’s JavaScript search framework for building
                        world-class search experiences, was made for the task.
                      </p>
                    </EuiText>
                    <EuiSpacer />
                    <EuiFlexGroup gutterSize="l" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiLink href="#" external>
                          Learn more about Search UI
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink href="#" external>
                          Search UI on Github
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
