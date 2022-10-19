/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiButton,
  EuiButtonEmpty,
  EuiImage,
  useEuiTheme,
} from '@elastic/eui';

import { SEARCH_EXPERIENCES_PLUGIN } from '../../../../../common/constants';
import welcomeGraphicDark from '../../../../assets/images/welcome_dark.svg';
import welcomeGraphicLight from '../../../../assets/images/welcome_light.svg';

import { SetElasticsearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchSearchExperiencesPageTemplate } from '../layout';

export const SearchExperiencesGuide: React.FC = () => {
  const { colorMode } = useEuiTheme();

  return (
    <EnterpriseSearchSearchExperiencesPageTemplate
      pageHeader={{
        pageTitle: 'Build a search experience',
        rightSideItems: [
          <EuiButton
            href={SEARCH_EXPERIENCES_PLUGIN.DOCUMENTATION_URL}
            target="_blank"
            color="primary"
            fill
            iconType={'popout'}
            iconSide="right"
          >
            Visit the Search UI documentation
          </EuiButton>,
          <EuiButtonEmpty
            href={SEARCH_EXPERIENCES_PLUGIN.GITHUB_URL}
            target="_blank"
            iconType={'popout'}
            iconSide="right"
          >
            Search UI on Github
          </EuiButtonEmpty>,
        ],
      }}
    >
      <SetPageChrome />
      <EuiPanel color="transparent" paddingSize="none">
        <EuiFlexGroup
          className="addContentEmptyPrompt"
          justifyContent="spaceBetween"
          direction="row"
        >
          <EuiFlexItem grow>
            <EuiFlexGroup direction="column" justifyContent="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>Get Started with Search UI</h2>
                </EuiTitle>
                <EuiSpacer size="l" />
                <EuiText grow={false}>
                  <p>
                    <EuiLink href={SEARCH_EXPERIENCES_PLUGIN.GITHUB_URL} target="_blank">
                      <strong>Search UI</strong>
                    </EuiLink>{' '}
                    is a JavaScript library for implementing world-class search experiences without
                    reinventing the wheel. It works out of the box with Elasticsearch, App Search,
                    and Workplace Search, so you can focus on building the best experience for your
                    users, customers, and employees.
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>Features</h3>
                </EuiTitle>
                <EuiSpacer size="l" />
                <EuiText grow={false}>
                  <ul>
                    <li>
                      <strong>You know, for search</strong> &mdash; Maintained by Elastic, the team behind Elasticsearch.
                    </li>
                    <li>
                      <strong>Speedy Implementation</strong> &mdash; Build a complete search
                      experience with a few lines of code.
                    </li>
                    <li>
                      <strong>Customizable</strong> &mdash; Tune the components, markup, styles, and
                      behaviors to your liking.
                    </li>
                    <li>
                      <strong>Smart URLs</strong> &mdash; Searches, paging, filtering, and more, are
                      captured in the URL for direct result linking.
                    </li>
                    <li>
                      <strong>Flexible front-end</strong> &mdash; Not just for React. Use with any
                      JavaScript library, even vanilla JavaScript.
                    </li>
                  </ul>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              size="xl"
              float="right"
              src={colorMode === 'LIGHT' ? welcomeGraphicLight : welcomeGraphicDark}
              alt="Search experiences illustration"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EnterpriseSearchSearchExperiencesPageTemplate>
  );
};
