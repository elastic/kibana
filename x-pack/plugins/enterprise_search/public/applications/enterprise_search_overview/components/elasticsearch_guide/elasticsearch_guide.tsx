/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPageTemplate,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';

import { ElasticsearchResources } from '../elasticsearch_resources';

const steps = [
  {
    title: 'Connect to Elasticsearch',
    children: (
      <>
        <EuiText>
          <p>
            Elastic builds and maintains clients in several popular languages and our community has
            contributed many more. They're easy to work with, feel natural to use, and, just like
            Elasticsearch, don't limit what you might want to do with them.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLink href="#" external>
          Learn more about Elasticsearch clients
        </EuiLink>
        <EuiCodeBlock language="bash">npm install</EuiCodeBlock>
        <EuiLink href="#" external>
          Learn more about the Elasticsearch JavaScript client
        </EuiLink>
      </>
    ),
  },
  {
    title: 'Build a search experience with Elasticsearch',
    children: (
      <>
        <EuiText>
          <p>
            Ready to add an engaging, modern search experience to your application or website?
            Search UI, Elastic’s JavaScript search framework for building world-class search
            experiences, was made for the task.
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
];

export const ElasticsearchGuide: React.FC = () => (
  <EuiPageTemplate pageHeader={{ pageTitle: 'Elasticsearch' }}>
    Content goes here
    <EuiText>
      <h2>Getting started with Elasticsearch</h2>
      <p>
        Whether you are building a search-powered application, or designing a large-scale search
        implementation, Elasticsearch provides the low-level tools to create the most relevant and
        performant search experience.{' '}
      </p>
    </EuiText>
    <EuiSpacer />
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={3}>
        <EuiSteps headingElement="h2" steps={steps} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <ElasticsearchResources />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPageTemplate>
);
