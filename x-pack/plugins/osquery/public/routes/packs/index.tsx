/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

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
  const match = useRouteMatch();

  if (!permissions.readPacks) {
    return <MissingPrivileges />;
  }

  return (
    <Switch>
      <Route path={`${match.url}/add`}>
        {permissions.writePacks ? <AddPackPage /> : <MissingPrivileges />}
      </Route>
      <Route path={`${match.url}/:packId/edit`}>
        {permissions.writePacks ? <EditPackPage /> : <MissingPrivileges />}
      </Route>
      <Route path={`${match.url}/:packId`}>
        <PackDetailsPage />
      </Route>
      <Route path={`${match.url}`}>
        <PacksPage />
      </Route>
    </Switch>
  );
};

export const Packs = React.memo(PacksComponent);
