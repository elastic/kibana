/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';

import { EuiEmptyPrompt, EuiImage, EuiButton } from '@elastic/eui';

import illustration from './integrations--light.svg';

export const displayName = 'EmptyPage';

interface EmptyPageProps {
  integrationsPageLink: string;
}

export const EmptyPage: VFC<EmptyPageProps> = ({ integrationsPageLink }) => (
  <EuiEmptyPrompt
    icon={
      <EuiImage size="fullWidth" alt="Enable Threat Intelligence Integrations" src={illustration} />
    }
    title={<h3>Get started with Elastic Threat intelligence</h3>}
    titleSize="s"
    layout="horizontal"
    color="transparent"
    body={
      <>
        <p>
          Elastic Threat Intelligence makes it easy to analyze and investigate potential security
          threats by aggregating data from multiple sources in one place.
        </p>
        <p>
          You’ll be able to view data from all activated threat intelligence feeds and take action
          from this page.
        </p>
        <p>
          To get started with Elastic Threat Intelligence, enable one or more Threat Intelligence
          Integrations from the Integrations page. For more information, view the Security app
          documentation.
        </p>
      </>
    }
    actions={
      <EuiButton href={integrationsPageLink} color="primary" iconType="plusInCircle" fill>
        Add Integrations
      </EuiButton>
    }
  />
);

EmptyPage.displayName = displayName;
