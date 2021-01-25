/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TOP_QUERIES_WITH_CLICKS } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';

export const TopQueriesWithClicks: React.FC = () => {
  return (
    <AnalyticsLayout isAnalyticsView title={TOP_QUERIES_WITH_CLICKS}>
      <p>TODO: Top queries with clicks</p>
    </AnalyticsLayout>
  );
};
