/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';
import { FilterBy, getFormulaByFilter } from '../../../utils/get_formula_by_filter';

import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';

import { AnalyticsCollectionNoEventsCallout } from '../analytics_collection_no_events_callout/analytics_collection_no_events_callout';
import { AnalyticsCollectionToolbar } from '../analytics_collection_toolbar/analytics_collection_toolbar';
import { AnalyticsCollectionToolbarLogic } from '../analytics_collection_toolbar/analytics_collection_toolbar_logic';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';
import { AnalyticsCollectionViewMetricWithLens } from './analytics_collection_metric';
import { AnalyticsCollectionOverviewTable } from './analytics_collection_overview_table';

const filters = [
  {
    id: FilterBy.Searches,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.searches',
      {
        defaultMessage: 'Searches',
      }
    ),
  },
  {
    id: FilterBy.NoResults,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.noResults',
      {
        defaultMessage: 'No results',
      }
    ),
  },
  {
    id: FilterBy.Clicks,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.clicks',
      {
        defaultMessage: 'Click',
      }
    ),
  },
  {
    id: FilterBy.Sessions,
    name: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.charts.sessions',
      {
        defaultMessage: 'Sessions',
      }
    ),
  },
];

interface AnalyticsCollectionOverviewProps {
  analyticsCollection: AnalyticsCollection;
}

export const AnalyticsCollectionOverview: React.FC<AnalyticsCollectionOverviewProps> = ({
  analyticsCollection,
}) => {
  const { setTimeRange } = useActions(AnalyticsCollectionToolbarLogic);
  const { timeRange, searchSessionId } = useValues(AnalyticsCollectionToolbarLogic);
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.Searches);

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
      <AnalyticsCollectionNoEventsCallout analyticsCollection={analyticsCollection} />
      <EuiSpacer />

      <EuiFlexGroup direction="column">
        <EuiFlexGroup gutterSize="m">
          {filters.map(({ name, id }) => (
            <AnalyticsCollectionViewMetricWithLens
              key={id}
              id={`analytics-collection-metric-${analyticsCollection.name}-${id}`}
              isSelected={filterBy === id}
              name={name}
              onClick={(event) => {
                event.currentTarget?.blur();

                setFilterBy(id);
              }}
              collection={analyticsCollection}
              timeRange={timeRange}
              searchSessionId={searchSessionId}
              getFormula={getFormulaByFilter.bind(null, id)}
            />
          ))}
        </EuiFlexGroup>

        <AnalyticsCollectionChartWithLens
          id={'analytics-collection-chart-' + analyticsCollection.name}
          collection={analyticsCollection}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          searchSessionId={searchSessionId}
          selectedChart={filterBy}
          setSelectedChart={setFilterBy}
        />

        <AnalyticsCollectionOverviewTable filterBy={filterBy} />
      </EuiFlexGroup>
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
