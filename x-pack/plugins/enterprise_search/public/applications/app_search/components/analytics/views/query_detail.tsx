/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AnalyticsLogic, AnalyticsCards, AnalyticsChart, convertToChartData } from '..';
import { useDecodedParams } from '../../../utils/encode_path_params';

import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSection, QueryClicksTable } from '../components';

const QUERY_DETAIL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.title',
  { defaultMessage: 'Query' }
);

export const QueryDetail: React.FC = () => {
  const { query } = useDecodedParams();
  const queryTitle = query === '""' ? query : `"${query}"`;

  const { totalQueriesForQuery, queriesPerDayForQuery, startDate, topClicksForQuery } =
    useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isQueryView title={queryTitle} breadcrumbs={[QUERY_DETAIL_TITLE, query]}>
      <AnalyticsCards
        stats={[
          {
            stat: totalQueriesForQuery,
            text: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.cardDescription',
              {
                defaultMessage: 'Queries for {queryTitle}',
                values: { queryTitle: query },
              }
            ),
          },
        ]}
      />
      <EuiSpacer />

      <EuiPanel hasBorder>
        <AnalyticsChart
          lines={[
            {
              id: i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.chartTooltip',
                { defaultMessage: 'Queries per day' }
              ),
              data: convertToChartData({ startDate, data: queriesPerDayForQuery }),
            },
          ]}
        />
      </EuiPanel>
      <EuiSpacer />

      <AnalyticsSection
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.tableTitle',
          { defaultMessage: 'Top clicks' }
        )}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.tableDescription',
          { defaultMessage: 'The documents with the most clicks resulting from this query.' }
        )}
      >
        <QueryClicksTable items={topClicksForQuery} />
      </AnalyticsSection>
    </AnalyticsLayout>
  );
};
