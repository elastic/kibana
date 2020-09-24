/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { Route, Switch } from 'react-router-dom';

import { GROUP_PATH, GROUPS_PATH } from '../../routes';

import { GroupsLogic } from './groups_logic';

import { GroupRouter } from './group_router';
import { Groups } from './groups';

import './groups.scss';

export const GroupsRouter: React.FC = () => {
  const { initializeGroups } = useActions(GroupsLogic);

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
