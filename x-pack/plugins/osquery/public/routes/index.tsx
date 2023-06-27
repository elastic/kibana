/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate } from 'react-router-dom-v5-compat';
import { Routes, Route } from '@kbn/shared-ux-router';

import { useBreadcrumbs } from '../common/hooks/use_breadcrumbs';
import { LiveQueries } from './live_queries';
import { SavedQueries } from './saved_queries';
import { Packs } from './packs';

const OsqueryAppRoutesComponent = () => {
  useBreadcrumbs('base');

  return (
    <Routes legacySwitch={false}>
      <Route path="packs/*" element={<Packs />} />
      <Route path="saved_queries/*" element={<SavedQueries />} />
      <Route path="live_queries/*" element={<LiveQueries />} />
      <Route index element={<Navigate to="live_queries" replace />} />
    </Routes>
  );
};

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
