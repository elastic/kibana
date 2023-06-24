/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { QueriesPage } from './list';
import { NewSavedQueryPage } from './new';
import { EditSavedQueryPage } from './edit';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { MissingPrivileges } from '../components';
import { useKibana } from '../../common/lib/kibana';

const SavedQueriesComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  useBreadcrumbs('saved_queries');

  if (!permissions.readSavedQueries) {
    return <MissingPrivileges />;
  }

  return (
    <Routes legacySwitch={false}>
      <Route
        path="new"
        element={permissions.writeSavedQueries ? <NewSavedQueryPage /> : <MissingPrivileges />}
      />
      <Route path=":savedQueryId" element={<EditSavedQueryPage />} />
      <Route index element={<QueriesPage />} />
    </Routes>
  );
};

export const SavedQueries = React.memo(SavedQueriesComponent);
