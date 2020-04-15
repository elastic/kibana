/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageSideBar,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiImage,
  EuiIcon,
  EuiTabbedContent,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
} from '@elastic/eui';

import GettingStarted from '../../assets/getting_started.png';
import './setup_guide.scss';

export const SetupGuide: React.FC<> = () => {
  return (
    <EuiPage className="setup-guide">
      <EuiPageSideBar>
        <EuiText color="subdued" size="s">
          <strong>Setup Guide</strong>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAppSearch" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>App Search</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <a
          href="https://www.elastic.co/webinars/getting-started-with-elastic-app-search"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="setup-guide__thumbnail"
            src={GettingStarted}
            alt="Getting started with App Search - in this short video we'll guide you through how to get App Search up and running"
            width="1280"
            height-="720"
          />
        </a>

        <EuiTitle size="s">
          <p>
            Set up App Search to leverage dashboards, analytics, and APIs for advanced application
            search made simple.
          </p>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            App Search has not been configured in your Kibana instance yet. To get started, follow
            the instructions on this page.
          </p>
        </EuiText>
      </EuiPageSideBar>

      <EuiPageBody>
        <EuiPageContent>
          <EuiTabbedContent
            tabs={[
              {
                id: 'cloud',
                name: 'Cloud',
                content: (
                  <>
                    <EuiSpacer />
                    <EuiSteps
                      headingElement="h2"
                      steps={[
                        {
                          title: 'Step 1 has intro plus code snippet',
                          children: (
                            <EuiText>
                              <p>Run this code snippet to install things.</p>
                              <EuiCodeBlock language="bash">npm install</EuiCodeBlock>
                            </EuiText>
                          ),
                        },
                        {
                          title: 'Reload your Kibana instance',
                          children: (
                            <EuiText>
                              <p>Run this code snippet to install things.</p>
                              <EuiCodeBlock language="bash">npm install</EuiCodeBlock>
                            </EuiText>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                id: 'smas',
                name: 'Self-Managed',
                content: (
                  <>
                    <EuiSpacer />
                    <EuiSteps
                      headingElement="h2"
                      steps={[
                        {
                          title: 'Add your App Search host URL to your Kibana configuration',
                          children: (
                            <EuiText>
                              <p>
                                Within your <EuiCode>config/kibana.yml</EuiCode> file, add the
                                following the host URL of your App Search instace as{' '}
                                <EuiCode>app_search.host</EuiCode>.
                              </p>
                              <EuiCodeBlock language="yml">
                                app_search.host: &apos;http://localhost:3002&apos;
                              </EuiCodeBlock>
                            </EuiText>
                          ),
                        },
                        {
                          title: 'Reload your Kibana instance',
                          children: (
                            <EuiText>
                              <p>
                                After updating your Kibana config file, restart Kibana to pick up
                                your changes.
                              </p>
                            </EuiText>
                          ),
                        },
                        {
                          title:
                            'Ensure that your Kibana users have corresponding App Search accounts',
                          children: (
                            <EuiText>
                              <p>If you’re using Elasticsearch Native auth - you’re all set.</p>
                              <p>
                                (If you’re using standard auth) Log into App Search and invite your
                                Kibana users into App Search! Be sure to use their corresponding
                                Kibana usernames.
                              </p>
                              <p>If you’re on SAML auth - ??????</p>
                            </EuiText>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
            ]}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
