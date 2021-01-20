/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ANALYTICS_TITLE } from '../constants';
import { AnalyticsLayout } from '../analytics_layout';

export const Analytics: React.FC = () => {
  return (
    <AnalyticsLayout isAnalyticsView title={ANALYTICS_TITLE}>
      <p>TODO: Analytics overview</p>
    </AnalyticsLayout>
  );
};
