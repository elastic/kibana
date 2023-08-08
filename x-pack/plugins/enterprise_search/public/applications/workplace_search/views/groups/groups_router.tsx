/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { GROUP_PATH, GROUPS_PATH } from '../../routes';

import { GroupRouter } from './group_router';
import { Groups } from './groups';
import { GroupsLogic } from './groups_logic';

import './groups.scss';

export const GroupsRouter: React.FC = () => {
  const { initializeGroups } = useActions(GroupsLogic);

  useEffect(() => {
    initializeGroups();
  }, []);

  return (
    <Routes>
      <Route exact path={GROUPS_PATH}>
        <Groups />
      </Route>
      <Route path={GROUP_PATH}>
        <GroupRouter />
      </Route>
    </Routes>
  );
};
