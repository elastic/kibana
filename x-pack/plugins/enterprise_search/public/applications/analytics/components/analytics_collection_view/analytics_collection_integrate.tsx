/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCodeBlock,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url';

interface AnalyticsCollectionIntegrateProps {
  collection: AnalyticsCollection;
}

type TabKey = 'javascriptEmbed' | 'searchuiEmbed' | 'javascriptClientEmbed';

export const AnalyticsCollectionIntegrate: React.FC<AnalyticsCollectionIntegrateProps> = ({
  collection,
}) => {
  const analyticsDNSUrl = getEnterpriseSearchUrl(`/analytics/api/collections/${collection.id}`);
  const webClientSrc = getEnterpriseSearchUrl('/analytics.js');

  const [selectedTab, setSelectedTab] = React.useState<TabKey>('javascriptEmbed');

  const Steps: Record<TabKey, Array<{ title: string; children: React.ReactElement }>> = {
    javascriptEmbed: [
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
            defaultMessage: 'Initialise the client',
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
                      'You must initialise the client before you can track events. We recommend initialising just below the script tag.',
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
                      <EuiLink href="http://www.elastic.co" target="_blank">
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
              <EuiCodeBlock language="html" isCopyable>
                {`<script src="${webClientSrc}" data-dsn="${analyticsDNSUrl}" defer></script>`}
              </EuiCodeBlock>
            </EuiText>
          </>
        ),
      },
    ],
    searchuiEmbed: [
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
                        onClick={() => {
                          setSelectedTab('javascriptClientEmbed');
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
                        onClick={() => {
                          setSelectedTab('javascriptEmbed');
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
                      'Finally, add the plugin to your Search UI configuration. Depending on how you have embedded Behavioural analytics, you may need to pass in the client. The example below shows how to pass in the client when using the Javascript client.',
                  }
                )}
              </p>
              <EuiCodeBlock language="javascript" isCopyable>
                {`
import { getTracker } from "@elastic/behavioral-analytics-tracker";

const searchUIConfig = {
  ...
  plugins: [AnalyticsPlugin(
    client: getTracker();
  )],
  ...
}`}
              </EuiCodeBlock>
            </EuiText>
          </>
        ),
      },
    ],
    javascriptClientEmbed: [
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
} from "@elastic/behavioural-analytics-javascript-tracker";`}
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
                      ' Use createTracker method to initialize the tracker with your DSN. You will then be able to use the tracker to send events to Behavioural Analytics.',
                  }
                )}
              </p>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.descriptionTwo',
                  {
                    defaultMessage:
                      'Once you have called createTracker, you can use the tracker methods such as trackPageView to send events to Behavioural Analytics.',
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
                      'Once you have called createTracker, you can use the tracker methods such as trackPageView to send events to Behavioural Analytics.',
                  }
                )}
              </p>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.descriptionTwo',
                  {
                    defaultMessage:
                      'Once initialised, you will be able to track page views in your application.',
                  }
                )}
              </p>
              <EuiCodeBlock language="javascript" isCopyable>
                {`// track a page view in React

const SearchPage = (props) => {
  useEffect(() => {
    trackPageView();
  }, []);

  return (
    <div>
      <h1>Search Page</h1>
      <
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
                      'You can also dispatch custom events to Behavioural Analytics by calling the trackEvent method.',
                  }
                )}
              </p>
              <EuiCodeBlock language="javascript" isCopyable>
                {`// track a custom event in React
import { trackEvent } from '@elastic/behavioural-analytics-javascript-tracker';

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
      }} />
      }}>Add to Basket</input>
    </div>
  )
}`}
              </EuiCodeBlock>
            </EuiText>
          </>
        ),
      },
    ],
  };

  const tabs: Array<{ key: TabKey; title: string }> = [
    {
      key: 'javascriptEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.title',
        {
          defaultMessage: 'Javascript Embed',
        }
      ),
    },
    {
      key: 'javascriptClientEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.title',
        {
          defaultMessage: 'Javascript Client',
        }
      ),
    },
    {
      key: 'searchuiEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchuiEmbed.title',
        {
          defaultMessage: 'Search UI',
        }
      ),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.title',
            {
              defaultMessage: 'Start tracking events',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.key}
            onClick={() => {
              setSelectedTab(tab.key);
            }}
            isSelected={selectedTab === tab.key}
            data-test-subj={tab.key}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="xxl" />
      <EuiSteps steps={Steps[selectedTab]} />
    </EuiPanel>
  );
};
