/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LocalUIFilters } from './LocalUIFilters';
import { RumDashboard } from './RumDashboard';

export function RumOverview() {
  useTrackPageview({ app: 'ux', path: 'home' });
  useTrackPageview({ app: 'ux', path: 'home', delay: 15000 });

  return (
    <>
      <LocalUIFilters />
      <EuiSpacer size="m" />
      <RumDashboard />
    </>
  );
}
