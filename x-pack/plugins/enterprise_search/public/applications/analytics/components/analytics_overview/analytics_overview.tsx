/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPageTemplate,
} from '@elastic/eui';

import { SetAnalyticsChrome as SetPageChrome } from '../../../shared/kibana_chrome';

export const AnalyticsOverview: React.FC = () => {
  return (
    <EuiPageTemplate>
      <SetPageChrome />
      <h1>Analytics!</h1>
      <p>📈 Like numbers but very business</p>
    </EuiPageTemplate>
  );
};
