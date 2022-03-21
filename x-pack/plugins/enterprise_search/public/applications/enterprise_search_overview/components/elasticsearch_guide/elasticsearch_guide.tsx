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
  EuiSubSteps,
  EuiCodeBlock,
  EuiCode,
} from '@elastic/eui';

import { ElasticsearchResources } from '../elasticsearch_resources';

const steps = [
  {
    title: 'Step 1 has intro plus code snippet',
    children: (
      <>
        <EuiText>
          <p>Run this code snippet to install things.</p>
        </EuiText>
        <EuiSpacer />
        <EuiCodeBlock language="bash">npm install</EuiCodeBlock>
      </>
    ),
  },
  {
    title: 'Step 2 has sub steps',
    children: (
      <EuiText>
        <p>
          In order to complete this step, do the following things <strong>in order</strong>.
        </p>
        <EuiSubSteps>
          <ol>
            <li>Do thing 1</li>
            <li>Do thing 2</li>
            <li>Do thing 3</li>
          </ol>
        </EuiSubSteps>
        <p>Here are some bullet point reminders.</p>
        <ul>
          <li>Reminder 1</li>
          <li>Reminder 2</li>
          <li>Reminder 3</li>
        </ul>
      </EuiText>
    ),
  },
  {
    title: 'Step 3 has an intro and one line instruction',
    children: (
      <EuiText>
        <p>
          Now that you&apos;ve completed step 2, go find the <EuiCode>thing</EuiCode>.
        </p>
        <p>
          Go to <strong>Overview &gt;&gt; Endpoints</strong> note <strong>Elasticsearch</strong> as{' '}
          <EuiCode>&lt;thing&gt;</EuiCode>.
        </p>
      </EuiText>
    ),
  },
  {
    title: 'The last step has two options',
    children: (
      <EuiText size="s">
        <h3>
          <strong>Option 1:</strong> If you have this type of instance
        </h3>
        <EuiSubSteps>
          <ol>
            <li>Do thing 1</li>
            <li>Do thing 2</li>
            <li>Do thing 3</li>
          </ol>
        </EuiSubSteps>
        <h3>
          <strong>Option 2:</strong> If you have the other type of instance
        </h3>
        <EuiSubSteps>
          <ol>
            <li>Do thing 1</li>
            <li>Do thing 2</li>
            <li>Do thing 3</li>
          </ol>
        </EuiSubSteps>
      </EuiText>
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
