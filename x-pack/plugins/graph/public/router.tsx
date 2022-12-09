/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createHashHistory } from 'history';
import { Navigate, Route, Router, Routes } from 'react-router-dom';
import { ListingRoute } from './apps/listing_route';
import { GraphServices } from './application';
import { WorkspaceRoute } from './apps/workspace_route';

const Wrapper = ({ deps }: { deps: GraphServices }) => {
  const history = createHashHistory();

  return (
    <Router navigator={history} location={history.location}>
      <Routes>
        <Route path="/home" element={<ListingRoute deps={deps} />} />
        <Route path="/workspace/:id?" element={<WorkspaceRoute deps={deps} />} />
        <Route element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
};

export const graphRouter = (deps: GraphServices) => {
  return <Wrapper deps={deps} />;
};
