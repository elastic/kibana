/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import {
  ANALYTICS_TITLE,
  TOTAL_QUERIES,
  TOTAL_QUERIES_NO_RESULTS,
  TOTAL_CLICKS,
} from '../constants';
import { AnalyticsLayout } from '../analytics_layout';
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

      <p>TODO: Analytics overview</p>
    </AnalyticsLayout>
  );
};
