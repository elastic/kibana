/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TOP_QUERIES_NO_RESULTS } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';

export const TopQueriesNoResults: React.FC = () => {
  return (
    <AnalyticsLayout isAnalyticsView title={TOP_QUERIES_NO_RESULTS}>
      <p>TODO: Top queries with no results</p>
    </AnalyticsLayout>
  );
};
