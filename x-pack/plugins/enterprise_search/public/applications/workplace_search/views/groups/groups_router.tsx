/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { Route, Switch, withRouter } from 'react-router-dom';

import { GROUP_PATH, GROUPS_PATH } from 'workplace_search/utils/routePaths';

import { GroupsLogic, IGroupsActions } from './GroupsLogic';

import GroupRouter from './GroupRouter';
import Groups from './Groups';

export const GroupsRouter: React.FC = () => {
  const { initializeGroups } = useActions(GroupsLogic) as IGroupsActions;

  useEffect(() => {
    initializeGroups();
  }, []);

  return (
    <Switch>
      <Route exact path={GROUPS_PATH} component={Groups} />
      <Route path={GROUP_PATH} component={GroupRouter} />
    </Switch>
  );
};
