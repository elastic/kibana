/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { Route, Switch } from 'react-router-dom';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { GROUP_PATH, GROUPS_PATH } from '../../routes';
import { NAV } from '../../constants';

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
      <Route exact path={GROUPS_PATH}>
        <SetPageChrome trail={[NAV.GROUPS]} />
        <SendTelemetry action="viewed" metric="groups" />
        <Groups />
      </Route>
      <Route path={GROUP_PATH}>
        <GroupRouter />
      </Route>
    </Switch>
  );
};
