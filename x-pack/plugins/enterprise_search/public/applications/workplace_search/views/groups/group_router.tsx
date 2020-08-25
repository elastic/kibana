/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Route, Switch, withRouter } from 'react-router-dom';

import {
  GROUP_SOURCE_PRIORITIZATION_PATH,
  GROUP_PATH,
  GROUPS_PATH,
  getGroupPath,
  getGroupSourcePrioritizationPath,
} from 'workplace_search/utils/routePaths';

import { AppLogic, IAppValues } from 'workplace_search/App/AppLogic';
import { SidebarNavigation, AppView } from 'workplace_search/components';
import FlashMessages from 'shared/components/FlashMessages';
import { IRouter } from 'shared/types';
import { GroupLogic, IGroupActions, IGroupValues } from './GroupLogic';

import ManageUsersModal from './components/ManageUsersModal';
import SharedSourcesModal from './components/SharedSourcesModal';

import GroupOverview from './components/GroupOverview';
import GroupSourcePrioritization from './components/GroupSourcePrioritization';

// TOOD: Get the router params from useRouter
export const GroupRouter: React.FC<IRouter> = ({
  match: {
    params: { groupId },
  },
  history,
  location: { pathname },
}) => {
  const {
    initializeGroup,
    resetGroup,
    showSharedSourcesModal,
    showManageUsersModal,
    resetFlashMessages,
  } = useActions(GroupLogic) as IGroupActions;

  const {
    group: { name },
    sharedSourcesModalModalVisible,
    manageUsersModalVisible,
    flashMessages,
  } = useValues(GroupLogic) as IGroupValues;

  const { isFederatedAuth } = useValues(AppLogic) as IAppValues;

  useEffect(() => {
    initializeGroup(groupId, history);
    resetGroup();
  }, []);

  useEffect(() => {
    resetFlashMessages();
  }, [pathname]);

  const breadcrumbs = {
    topLevelPath: GROUPS_PATH,
    topLevelName: 'All groups',
    activeName: name,
  };

  const overviewLink = {
    title: 'Overview',
    path: getGroupPath(groupId),
  };

  const sourcePrioritizationLink = {
    title: 'Manage source prioritization',
    path: getGroupSourcePrioritizationPath(groupId),
  };

  const manageSourcesLink = {
    title: 'Manage shared content sources',
    onClick: showSharedSourcesModal,
    dataTestSubj: 'ManageSharedSourcesButton',
  };

  const manageUsersLink = {
    title: 'Manage users',
    onClick: showManageUsersModal,
    dataTestSubj: 'ManageUsersButton',
  };

  const links = isFederatedAuth
    ? [overviewLink, manageSourcesLink, sourcePrioritizationLink]
    : [overviewLink, manageSourcesLink, manageUsersLink, sourcePrioritizationLink];

  const sidebar = (
    <SidebarNavigation
      title={
        <>
          Manage <span className="eui-textOverflowWrap">{name}</span>
        </>
      }
      breadcrumbs={breadcrumbs}
      links={links}
    />
  );

  return (
    <AppView sidebar={sidebar}>
      {flashMessages && <FlashMessages {...flashMessages} />}
      <Switch>
        <Route path={GROUP_SOURCE_PRIORITIZATION_PATH} component={GroupSourcePrioritization} />
        <Route path={GROUP_PATH} component={GroupOverview} />
      </Switch>
      {sharedSourcesModalModalVisible && <SharedSourcesModal />}
      {manageUsersModalVisible && <ManageUsersModal />}
    </AppView>
  );
};
