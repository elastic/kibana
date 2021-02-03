/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { RECENT_QUERIES } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSearch, RecentQueriesTable } from '../components';
import { AnalyticsLogic } from '../';

export const RecentQueries: React.FC = () => {
  const { recentQueries } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isAnalyticsView title={RECENT_QUERIES}>
      <AnalyticsSearch />
      <RecentQueriesTable items={recentQueries} />
    </AnalyticsLayout>
  );
};
