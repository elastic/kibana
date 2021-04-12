/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { FilterMode as RecentTimelinesFilterMode } from '../recent_timelines/types';
import { FilterMode as RecentCasesFilterMode } from '../recent_cases/types';

import { Sidebar } from './sidebar';

export const StatefulSidebar = React.memo(() => {
  const [recentTimelinesFilterBy, setRecentTimelinesFilterBy] = useState<RecentTimelinesFilterMode>(
    'favorites'
  );
  const [recentCasesFilterBy, setRecentCasesFilterBy] = useState<RecentCasesFilterMode>(
    'recentlyCreated'
  );

  return (
    <Sidebar
      recentCasesFilterBy={recentCasesFilterBy}
      setRecentCasesFilterBy={setRecentCasesFilterBy}
      recentTimelinesFilterBy={recentTimelinesFilterBy}
      setRecentTimelinesFilterBy={setRecentTimelinesFilterBy}
    />
  );
});

StatefulSidebar.displayName = 'StatefulSidebar';
