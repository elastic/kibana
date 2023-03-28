/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiIconTip, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';

import { KibanaLogic } from '../../../shared/kibana';
import { AddAnalyticsCollection } from '../add_analytics_collections/add_analytics_collection';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';
import { AnalyticsCollectionDataViewIdLogic } from './analytics_collection_data_view_id_logic';

import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

export const collectionViewBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.breadcrumb', {
    defaultMessage: 'View collection',
  }),
];

export const AnalyticsCollectionView: React.FC = () => {
  const { fetchAnalyticsCollection } = useActions(FetchAnalyticsCollectionLogic);
  const { fetchAnalyticsCollectionDataViewId } = useActions(AnalyticsCollectionDataViewIdLogic);
  const { analyticsCollection, isLoading } = useValues(FetchAnalyticsCollectionLogic);
  const { dataViewId } = useValues(AnalyticsCollectionDataViewIdLogic);
  const { name, section } = useParams<{ name: string; section: string }>();
  const { application } = useValues(KibanaLogic);

  useEffect(() => {
    fetchAnalyticsCollection(name);
    fetchAnalyticsCollectionDataViewId(name);
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      isLoading={isLoading}
      pageChrome={[...collectionViewBreadcrumbs]}
      pageViewTelemetry={`View Analytics Collection - ${section}`}
      pageHeader={{
        bottomBorder: false,
        pageTitle: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.title', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: dataViewId
          ? [
              <RedirectAppLinks application={application}>
                <EuiLink
                  href={application.getUrlForApp('discover', {
                    path: `#/?_a=(index:'${dataViewId}')`,
                  })}
                >
                  <EuiIconTip
                    position="bottom"
                    content={
                      <FormattedMessage
                        id="xpack.enterpriseSearch.analytics.collectionsView.exploreTooltip"
                        defaultMessage="For a deeper analysis, explore event logs on Discover."
                      />
                    }
                    type="inspect"
                  />
                </EuiLink>
              </RedirectAppLinks>,
            ]
          : undefined,
      }}
    >
      {analyticsCollection ? (
        <AnalyticsCollectionChartWithLens
          id={'analytics-collection-chart-' + analyticsCollection.name}
          dataViewQuery={analyticsCollection.events_datastream}
          timeRange={{
            from: 'now-90d',
            to: 'now',
          }}
        />
      ) : (
        <EuiEmptyPrompt
          iconType="search"
          title={
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.collectionNotFoundState.headingTitle',
                {
                  defaultMessage: 'You may have deleted this analytics collection',
                }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.collectionNotFoundState.subHeading',
                {
                  defaultMessage:
                    'An analytics collection provides a place to store the analytics events for any given search application you are building. Create a new collection to get started.',
                }
              )}
            </p>
          }
          actions={[<AddAnalyticsCollection />]}
        />
      )}
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
