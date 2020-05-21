/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { PageView } from '../../common/components/endpoint/page_view';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { PolicyContainer } from './policy';

export const ManagementContainer = memo(() => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.path}/policy`} component={PolicyContainer} />

      <Route
        path={match.path}
        render={() => {
          return (
            <PageView viewType="list" headerLeft="Test">
              {'Its a test!'}
              <div>
                <a href="#/management/policy">{'Policy List'}</a>
              </div>
              <div>
                <a href="#/management/policy/123">{'Policy details'}</a>
              </div>
              <SpyRoute />
            </PageView>
          );
        }}
      />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
