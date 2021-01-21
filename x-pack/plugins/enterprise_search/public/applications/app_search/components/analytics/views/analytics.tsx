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
import { AnalyticsLogic, AnalyticsCards } from '../';

export const Analytics: React.FC = () => {
  const { totalQueries, totalQueriesNoResults, totalClicks } = useValues(AnalyticsLogic);

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
      <p>TODO: Analytics overview</p>
    </AnalyticsLayout>
  );
};
