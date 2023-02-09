/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const javascriptClientEmbedSteps = (analyticsDNSUrl: string) => [
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepOne.title',
      {
        defaultMessage: 'Install client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepOne.description',
              {
                defaultMessage:
                  'Download the behavioral analytics javascript tracker client from NPM.',
              }
            )}
          </p>
          <EuiCodeBlock language="bash" isCopyable>
            {'npm install @elastic/behavioral-analytics-javascript-tracker'}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepTwo.title',
      {
        defaultMessage: 'Import the client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepTwo.description',
              {
                defaultMessage: 'Import the client in your application.',
              }
            )}
          </p>
          <EuiCodeBlock language="bash" isCopyable>
            {`import {
  createTracker,
  trackPageView,
  trackEvent,
} from "@elastic/behavioral-analytics-javascript-tracker";`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.title',
      {
        defaultMessage: 'Initialize the client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.description',
              {
                defaultMessage:
                  ' Use createTracker method to initialize the tracker with your DSN. You will then be able to use the tracker to send events to Behavioral Analytics.',
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.descriptionTwo',
              {
                defaultMessage:
                  'Once you have called createTracker, you can use the tracker methods such as trackPageView to send events to Behavioral Analytics.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`createTracker({
  dsn: "${analyticsDNSUrl}",
});`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.title',
      {
        defaultMessage: 'Dispatch Pageview and behavior events',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.description',
              {
                defaultMessage:
                  'Once you have called createTracker, you can use the tracker methods such as trackPageView to send events to Behavioral Analytics.',
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.descriptionTwo',
              {
                defaultMessage:
                  'Once initialized, you will be able to track page views in your application.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`import { useEffect } from 'react';

// track a page view in React

const SearchPage = (props) => {
  useEffect(() => {
    trackPageView();
  }, []);

  return (
    <div>
      <h1>Search Page</h1>
    </div>
  );
};`}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.descriptionThree',
              {
                defaultMessage:
                  'You can also dispatch custom events to Behavioral Analytics by calling the trackEvent method.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`// track a custom event in React
import { trackEvent } from '@elastic/behavioral-analytics-javascript-tracker';

const ProductDetailPage = (props) => {

  return (
    <div>
      <h1>Product detail page</h1>
      <input type="button" onClick={() => {
        trackEvent("click", {
          category: "product",
          action: "add_to_cart",
          label: "product_id",
          value: "123"
        })
      }} value="Add to Basket"/>
    </div>
  )
}`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
];
