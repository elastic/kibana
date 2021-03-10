/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';

import { Queries } from '../../queries';
import { Packs } from '../../packs';
import { LiveQuery } from '../../live_query';

const CustomTabTabsComponent = () => {
  const location = useLocation();

  const selectedTab = useMemo(() => qs.parse(location.search)?.tab, [location.search]);

  if (selectedTab === 'packs') {
    return <Packs />;
  }

  if (selectedTab === 'saved_queries') {
    return <Queries />;
  }

  if (selectedTab === 'live_query') {
    return <LiveQuery />;
  }

  return <Packs />;
};

export const CustomTabTabs = React.memo(CustomTabTabsComponent);
