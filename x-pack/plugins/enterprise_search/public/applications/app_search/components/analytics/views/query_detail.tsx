/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';

import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSection, QueryClicksTable } from '../components';
import { AnalyticsLogic, AnalyticsCards, AnalyticsChart, convertToChartData } from '../';

const QUERY_DETAIL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.title',
  { defaultMessage: 'Query' }
);

interface Props {
  breadcrumbs: BreadcrumbTrail;
}
export const QueryDetail: React.FC<Props> = ({ breadcrumbs }) => {
  const { query } = useParams() as { query: string };

  const { totalQueriesForQuery, queriesPerDayForQuery, startDate, topClicksForQuery } = useValues(
    AnalyticsLogic
  );

  return (
    <AnalyticsLayout isQueryView title={`"${query}"`}>
      <SetPageChrome trail={[...breadcrumbs, QUERY_DETAIL_TITLE, query]} />

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
