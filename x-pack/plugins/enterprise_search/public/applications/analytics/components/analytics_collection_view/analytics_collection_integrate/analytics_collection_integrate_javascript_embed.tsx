/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiLink, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../shared/doc_links';

export const javascriptEmbedSteps = (webClientSrc: string, analyticsDNSUrl: string) => [
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
            {`<script src="${webClientSrc}" data-dsn="${analyticsDNSUrl}"></script>`}
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
            {'<script type="text/javascript">window.elasticAnalytics.createTracker();</script>'}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchuiEmbed.stepThree.title',
      {
        defaultMessage: 'Track individual events',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepThree.description"
              defaultMessage="Track individual events, like clicks, by calling the trackEvent method. {link}"
              values={{
                link: (
                  <EuiLink
                    href={docLinks.behavioralAnalyticsEvents}
                    target="_blank"
                    data-telemetry-id={
                      'entSearch-analytics-integrate-javascriptEmbed-trackEventDocumentationLink'
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.stepThree.link',
                      {
                        defaultMessage: 'Learn more about tracking events',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`window.elasticAnalytics.trackEvent("click", {
  category: "product",
  action: "add_to_cart",
  label: "product_id",
  value: "123"
});`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
];
