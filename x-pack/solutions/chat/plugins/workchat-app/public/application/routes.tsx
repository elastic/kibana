/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { WorkChatHomePage } from './pages/home';
import { DataSourcesPage } from './pages/data_sources';
import { ConnectionsPage } from './pages/connections';
import { DataSourceConfigPage } from './pages/data_source_config';

export const WorkchatAppRoutes: React.FC<{}> = () => {
  return (
    <Routes>
      <Route path="/data/source/:type">
        <DataSourceConfigPage />
      </Route>
      <Route path="/data/sources">
        <DataSourcesPage />
      </Route>
      <Route path="/data/connections">
        <ConnectionsPage />
      </Route>
      <Route path="/">
        <WorkChatHomePage />
      </Route>
    </Routes>
  );
};
