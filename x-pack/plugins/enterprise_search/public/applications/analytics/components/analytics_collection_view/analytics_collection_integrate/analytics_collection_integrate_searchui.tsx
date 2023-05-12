/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { TabKey } from './analytics_collection_integrate_view';

export const searchUIEmbedSteps = (setSelectedTab: (tab: TabKey) => void) => [
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchuiEmbed.stepOne.title',
      {
        defaultMessage: 'Embed Behavioral Analytics',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepOne.description"
              defaultMessage="Follow the instructions to embed Behavioral Analytics into your site via {embedLink} or {clientLink}."
              values={{
                embedLink: (
                  <EuiLink
                    data-telemetry-id={'entSearch-analytics-integrate-javascriptEmbed-tab'}
                    onClick={() => {
                      setSelectedTab('javascriptEmbed');
                    }}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepOne.embedLink',
                      {
                        defaultMessage: 'Javascript Embed',
                      }
                    )}
                  </EuiLink>
                ),
                clientLink: (
                  <EuiLink
                    data-telemetry-id={'entSearch-analytics-integrate-javascriptClientEmbed-tab'}
                    onClick={() => {
                      setSelectedTab('javascriptClientEmbed');
                    }}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepOne.clientLink',
                      {
                        defaultMessage: 'Javascript Client',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchuiEmbed.stepTwo.title',
      {
        defaultMessage: 'Install Search UI Behavioral Analytics Plugin',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepTwo.description',
              {
                defaultMessage: 'Download the Behavioral Analytics plugin from NPM.',
              }
            )}
          </p>
          <EuiCodeBlock language="bash" isCopyable>
            {'npm install @elastic/search-ui-analytics-plugin'}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepTwo.importDescription',
              {
                defaultMessage: 'Then import the Behavioral Analytics plugin into your app.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {'import AnalyticsPlugin from "@elastic/search-ui-analytics-plugin";'}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepTwo.setupDescription',
              {
                defaultMessage:
                  'Finally, add the plugin to your Search UI configuration. Depending on how you have embedded Behavioral Analytics, you may need to pass in the client. The example below shows how to pass in the client when using the Javascript client.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`
import { getTracker } from "@elastic/behavioral-analytics-javascript-tracker";

const searchUIConfig = {
...
plugins: [
  AnalyticsPlugin({
    client: getTracker()
  })
],
...
}`}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepTwo.moreInfoDescription"
              defaultMessage="See the {link} for more information on initializing the tracker and firing events."
              values={{
                link: (
                  <EuiLink
                    href="https://docs.elastic.co/search-ui/api/core/plugins/analytics-plugin"
                    target="_blank"
                    data-telemetry-id={
                      'entSearch-analytics-integrate-javascriptEmbed-analyticsPluginDocumentationLink'
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchui.stepTwo.analyticsPluginDoc',
                      {
                        defaultMessage: 'Analytics Plugin Documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </>
    ),
  },
];
