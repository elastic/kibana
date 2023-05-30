/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AnalyticsConfig } from './analytics_collection_integrate_view';

export const javascriptEmbedSteps = (webClientSrc: string, analyticsConfig: AnalyticsConfig) => [
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepOne.title',
      {
        defaultMessage: 'Embed onto site',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepOne.description',
              {
                defaultMessage:
                  'Embed the behavioral analytics JavaScript snippet on every page of the website or application you’d like to track.',
              }
            )}
          </p>
          <EuiCodeBlock language="html" isCopyable>
            {`<script src="${webClientSrc}"></script>`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepTwo.title',
      {
        defaultMessage: 'Initialize the client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepTwo.description',
              {
                defaultMessage:
                  'You must initialize the client before you can track events. We recommend initializing just below the script tag.',
              }
            )}
          </p>
          <EuiCodeBlock language="html" isCopyable>
            {`<script type="text/javascript">
window.elasticAnalytics.createTracker({
  endpoint: "${analyticsConfig.endpoint}",
  collectionName: "${analyticsConfig.collectionName}",
  apiKey: "${analyticsConfig.apiKey}",
  // Optional: sampling rate percentage: 0-1, 0 = no events, 1 = all events
  // sampling: 1,
});
</script>`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepThree.title',
      {
        defaultMessage: 'Track search events',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepThree.description"
              defaultMessage="Track individual search events, like result clicks and searches, by using the trackSearch or trackSearchClick methods."
            />
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`window.elasticAnalytics.trackSearch({
  search: {
    query: "laptop",
    filters: {
      brand: ["apple"],
      price: ["1000-2000"],
    },
    page: {
      current: 1,
      size: 10,
    },
    results: {
      items: [
        {
          document: {
            id: "123",
            index: "products",
          },
          page: {
            url: "http://my-website.com/products/123",
          },
        },
      ],
      total_results: 100,
    },
    sort: {
      name: "relevance",
    },
    search_application: "website",
  }
});`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
];
