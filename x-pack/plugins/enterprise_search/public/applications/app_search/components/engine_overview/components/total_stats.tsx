/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EngineOverviewLogic } from '..';
import { AnalyticsCards } from '../../analytics';
import { TOTAL_QUERIES, TOTAL_DOCUMENTS, TOTAL_CLICKS } from '../../analytics/constants';

export const TotalStats: React.FC = () => {
  const { totalQueries, documentCount, totalClicks } = useValues(EngineOverviewLogic);

  return (
    <AnalyticsCards
      stats={[
        {
          stat: totalQueries,
          text: TOTAL_QUERIES,
          dataTestSubj: 'TotalQueriesCard',
        },
        {
          stat: documentCount,
          text: TOTAL_DOCUMENTS,
          dataTestSubj: 'TotalDocumentsCard',
        },
        {
          stat: totalClicks,
          text: TOTAL_CLICKS,
          dataTestSubj: 'TotalClicksCard',
        },
      ]}
    />
  );
};
