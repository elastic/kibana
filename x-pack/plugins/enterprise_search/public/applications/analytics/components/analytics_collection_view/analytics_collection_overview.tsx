/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';
import { AnalyticsCollectionToolbar } from './analytics_collection_toolbar/analytics_collection_toolbar';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';

interface AnalyticsCollectionOverviewProps {
  analyticsCollection: AnalyticsCollection;
}

export const AnalyticsCollectionOverview: React.FC<AnalyticsCollectionOverviewProps> = ({
  analyticsCollection,
}) => {
  const { setTimeRange } = useActions(AnalyticsCollectionToolbarLogic);
  const { timeRange, searchSessionId } = useValues(AnalyticsCollectionToolbarLogic);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      pageChrome={[analyticsCollection?.name]}
      analyticsName={analyticsCollection?.name}
      pageViewTelemetry={`View Analytics Collection - Overview`}
      pageHeader={{
        bottomBorder: false,
        pageTitle: i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.title', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [<AnalyticsCollectionToolbar />],
      }}
    >
      <AnalyticsCollectionChartWithLens
        id={'analytics-collection-chart-' + analyticsCollection.name}
        dataViewQuery={analyticsCollection.events_datastream}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        searchSessionId={searchSessionId}
      />
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
