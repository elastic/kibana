/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { TOP_QUERIES_WITH_CLICKS } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsTable } from '../components';
import { AnalyticsLogic } from '../';

export const TopQueriesWithClicks: React.FC = () => {
  const { topQueriesWithClicks } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isAnalyticsView title={TOP_QUERIES_WITH_CLICKS}>
      <AnalyticsTable items={topQueriesWithClicks} hasClicks />
    </AnalyticsLayout>
  );
};
