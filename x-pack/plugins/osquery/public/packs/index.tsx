/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { PacksPage } from './list';
import { NewPackPage } from './new';
import { EditPackPage } from './edit';

const PacksComponent = () => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        <NewPackPage />
      </Route>
      <Route path={`${match.url}/:packId`}>
        <EditPackPage />
      </Route>
      <Route path={`${match.url}/`}>
        <PacksPage />
      </Route>
    </Switch>
  );
};

export const Packs = React.memo(PacksComponent);
