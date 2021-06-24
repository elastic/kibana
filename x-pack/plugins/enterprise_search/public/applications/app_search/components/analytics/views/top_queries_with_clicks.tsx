/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { AnalyticsLogic } from '../';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSearch, AnalyticsTable } from '../components';
import { TOP_QUERIES_WITH_CLICKS } from '../constants';

export const TopQueriesWithClicks: React.FC = () => {
  const { topQueriesWithClicks } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout
      isAnalyticsView
      title={TOP_QUERIES_WITH_CLICKS}
      breadcrumbs={[TOP_QUERIES_WITH_CLICKS]}
    >
      <AnalyticsSearch />
      <AnalyticsTable items={topQueriesWithClicks} hasClicks />
    </AnalyticsLayout>
  );
};
