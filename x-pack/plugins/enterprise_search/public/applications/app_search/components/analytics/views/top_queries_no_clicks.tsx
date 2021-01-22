/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { TOP_QUERIES_NO_CLICKS } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsTable } from '../components';
import { AnalyticsLogic } from '../';

export const TopQueriesNoClicks: React.FC = () => {
  const { topQueriesNoClicks } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isAnalyticsView title={TOP_QUERIES_NO_CLICKS}>
      <AnalyticsTable items={topQueriesNoClicks} hasClicks />
    </AnalyticsLayout>
  );
};
