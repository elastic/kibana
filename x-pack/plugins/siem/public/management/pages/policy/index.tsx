/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { PolicyDetails, PolicyList } from './view';

export const PolicyContainer = memo(() => {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route path={path} exact component={PolicyList} />
      <Route path={`${path}/:policyId`} exact component={PolicyDetails} />
    </Switch>
  );
});

PolicyContainer.displayName = 'PolicyContainer';
