/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Route, Switch, useHistory, useParams } from 'react-router-dom';
import { History } from 'history';

import { FlashMessages, FlashMessagesLogic } from '../../../shared/flash_messages';
import { GROUP_SOURCE_PRIORITIZATION_PATH, GROUP_PATH } from '../../routes';
import { GroupLogic } from './group_logic';

import { ManageUsersModal } from './components/manage_users_modal';
import { SharedSourcesModal } from './components/shared_sources_modal';

import { GroupOverview } from './components/group_overview';
import { GroupSourcePrioritization } from './components/group_source_prioritization';

export const GroupRouter: React.FC = () => {
  const history = useHistory() as History;
  const { groupId } = useParams() as { groupId: string };

  const { messages } = useValues(FlashMessagesLogic);
  const { initializeGroup, resetGroup } = useActions(GroupLogic);
  const { sharedSourcesModalModalVisible, manageUsersModalVisible } = useValues(GroupLogic);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    initializeGroup(groupId, history);
    return resetGroup;
  }, []);

  return (
    <>
      {hasMessages && <FlashMessages />}
      <Switch>
        <Route path={GROUP_SOURCE_PRIORITIZATION_PATH} component={GroupSourcePrioritization} />
        <Route path={GROUP_PATH} component={GroupOverview} />
      </Switch>
      {sharedSourcesModalModalVisible && <SharedSourcesModal />}
      {manageUsersModalVisible && <ManageUsersModal />}
    </>
  );
};
