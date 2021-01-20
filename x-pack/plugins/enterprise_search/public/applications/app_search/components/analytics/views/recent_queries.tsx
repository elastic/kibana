/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { RECENT_QUERIES } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';

export const RecentQueries: React.FC = () => {
  return (
    <AnalyticsLayout isAnalyticsView title={RECENT_QUERIES}>
      <p>TODO: Recent queries</p>
    </AnalyticsLayout>
  );
};
