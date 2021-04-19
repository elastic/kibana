/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { ScheduledQueryGroupsPage } from './list';
import { AddScheduledQueryGroupPage } from './add';
import { EditScheduledQueryGroupPage } from './edit';
import { ScheduledQueryGroupDetailsPage } from './details';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';

const ScheduledQueryGroupsComponent = () => {
  useBreadcrumbs('scheduled_query_groups');
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/add`}>
        <AddScheduledQueryGroupPage />
      </Route>
      <Route path={`${match.url}/:scheduledQueryGroupId/edit`}>
        <EditScheduledQueryGroupPage />
      </Route>
      <Route path={`${match.url}/:scheduledQueryGroupId`}>
        <ScheduledQueryGroupDetailsPage />
      </Route>
      <Route path={`${match.url}`}>
        <ScheduledQueryGroupsPage />
      </Route>
    </Switch>
  );
};

export const ScheduledQueryGroups = React.memo(ScheduledQueryGroupsComponent);
