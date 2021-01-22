/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import {
  ANALYTICS_TITLE,
  TOTAL_QUERIES,
  TOTAL_QUERIES_NO_RESULTS,
  TOTAL_CLICKS,
  TOP_QUERIES,
  TOP_QUERIES_NO_RESULTS,
  TOP_QUERIES_WITH_CLICKS,
  TOP_QUERIES_NO_CLICKS,
  RECENT_QUERIES,
} from '../constants';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSection } from '../components';
import { AnalyticsLogic, AnalyticsCards, AnalyticsChart, convertToChartData } from '../';

export const Analytics: React.FC = () => {
  const {
    totalQueries,
    totalQueriesNoResults,
    totalClicks,
    queriesPerDay,
    queriesNoResultsPerDay,
    clicksPerDay,
    startDate,
  } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isAnalyticsView title={ANALYTICS_TITLE}>
      <AnalyticsCards
        stats={[
          {
            stat: totalQueries,
            text: TOTAL_QUERIES,
            dataTestSubj: 'TotalQueriesCard',
          },
          {
            stat: totalQueriesNoResults,
            text: TOTAL_QUERIES_NO_RESULTS,
            dataTestSubj: 'TotalQueriesNoResultsCard',
          },
          {
            stat: totalClicks,
            text: TOTAL_CLICKS,
            dataTestSubj: 'TotalClicksCard',
          },
        ]}
      />
      <EuiSpacer />

      <AnalyticsChart
        lines={[
          {
            id: TOTAL_QUERIES,
            data: convertToChartData({ startDate, data: queriesPerDay }),
          },
          {
            id: TOTAL_QUERIES_NO_RESULTS,
            data: convertToChartData({ startDate, data: queriesNoResultsPerDay }),
            isDashed: true,
          },
          {
            id: TOTAL_CLICKS,
            data: convertToChartData({ startDate, data: clicksPerDay }),
            isDashed: true,
          },
        ]}
      />
      <EuiSpacer />

      <AnalyticsSection
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryTablesTitle',
          { defaultMessage: 'Query analytics' }
        )}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryTablesDescription',
          {
            defaultMessage:
              'Gain insight into the most frequent queries, and which queries returned no results.',
          }
        )}
      >
        <EuiTitle size="s">
          <h3>{TOP_QUERIES}</h3>
        </EuiTitle>
        TODO
        <EuiSpacer />
        <EuiTitle size="s">
          <h3>{TOP_QUERIES_NO_RESULTS}</h3>
        </EuiTitle>
        TODO
      </AnalyticsSection>
      <EuiSpacer size="xl" />

      <AnalyticsSection
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.clickTablesTitle',
          { defaultMessage: 'Click analytics' }
        )}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.clickTablesDescription',
          {
            defaultMessage: 'Discover which queries generated the most and least amount of clicks.',
          }
        )}
      >
        <EuiTitle size="s">
          <h3>{TOP_QUERIES_WITH_CLICKS}</h3>
        </EuiTitle>
        TODO
        <EuiSpacer />
        <EuiTitle size="s">
          <h3>{TOP_QUERIES_NO_CLICKS}</h3>
        </EuiTitle>
        TODO
      </AnalyticsSection>
      <EuiSpacer size="xl" />

      <AnalyticsSection
        title={RECENT_QUERIES}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.recentQueriesDescription',
          { defaultMessage: 'A view into queries happening right now.' }
        )}
      >
        TODO
      </AnalyticsSection>
    </AnalyticsLayout>
  );
};
