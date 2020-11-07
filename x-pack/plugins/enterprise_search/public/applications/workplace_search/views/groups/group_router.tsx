/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Route, Switch, useParams } from 'react-router-dom';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { GROUP_SOURCE_PRIORITIZATION_PATH, GROUP_PATH } from '../../routes';
import { NAV } from '../../constants';
import { GroupLogic } from './group_logic';

import { ManageUsersModal } from './components/manage_users_modal';
import { SharedSourcesModal } from './components/shared_sources_modal';

import { GroupOverview } from './components/group_overview';
import { GroupSourcePrioritization } from './components/group_source_prioritization';

export const GroupRouter: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  const { initializeGroup, resetGroup } = useActions(GroupLogic);
  const {
    sharedSourcesModalVisible,
    manageUsersModalVisible,
    group: { name },
  } = useValues(GroupLogic);

  useEffect(() => {
    initializeGroup(groupId);
    return resetGroup;
  }, []);

  return (
    <>
      <FlashMessages />
      <Switch>
        <Route path={GROUP_SOURCE_PRIORITIZATION_PATH}>
          <SetPageChrome trail={[NAV.GROUPS, name || '...', NAV.SOURCE_PRIORITIZATION]} />
          <GroupSourcePrioritization />
        </Route>
        <Route path={GROUP_PATH}>
          <SetPageChrome trail={[NAV.GROUPS, name || '...']} />
          <SendTelemetry action="viewed" metric="group_overview" />
          <GroupOverview />
        </Route>
      </Switch>
      {sharedSourcesModalVisible && <SharedSourcesModal />}
      {manageUsersModalVisible && <ManageUsersModal />}
    </>
  );
};
