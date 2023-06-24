/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { PacksPage } from './list';
import { AddPackPage } from './add';
import { EditPackPage } from './edit';
import { PackDetailsPage } from './details';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useKibana } from '../../common/lib/kibana';
import { MissingPrivileges } from '../components';

const PacksComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  useBreadcrumbs('packs');

  if (!permissions.readPacks) {
    return <MissingPrivileges />;
  }

  return (
    <Routes legacySwitch={false}>
      <Route
        path="add"
        element={permissions.writePacks ? <AddPackPage /> : <MissingPrivileges />}
      />
      <Route
        path=":packId/edit"
        element={permissions.writePacks ? <EditPackPage /> : <MissingPrivileges />}
      />
      <Route path=":packId" element={<PackDetailsPage />} />
      <Route index element={<PacksPage />} />
    </Routes>
  );
};

export const Packs = React.memo(PacksComponent);
