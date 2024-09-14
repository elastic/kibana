/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutLoading } from '@kbn/security-solution-common';
import { useManagedUser } from '../shared/hooks/use_managed_user';
import { useTabs } from './tabs';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';

interface UserParam {
  name: string;
  email: string[];
}

export interface UserDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  user: UserParam;
  path?: PanelPath;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
}
export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user_details';
  params: UserDetailsPanelProps;
}
export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user_details';

export const UserDetailsPanel = ({
  isRiskScoreExist,
  user,
  path,
  scopeId,
  hasMisconfigurationFindings,
}: UserDetailsPanelProps) => {
  const managedUser = useManagedUser(user.name, user.email);
  const tabs = useTabs(
    managedUser.data,
    user.name,
    isRiskScoreExist,
    scopeId,
    hasMisconfigurationFindings
  );

  const { selectedTabId, setSelectedTabId } = useSelectedTab(
    isRiskScoreExist,
    user,
    tabs,
    path,
    hasMisconfigurationFindings
  );

  if (managedUser.isLoading) return <FlyoutLoading />;

  if (!selectedTabId) {
    return null;
  }

  return (
    <>
      <LeftPanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabs}
      />
      <LeftPanelContent selectedTabId={selectedTabId} tabs={tabs} />
    </>
  );
};

const useSelectedTab = (
  isRiskScoreExist: boolean,
  user: UserParam,
  tabs: LeftPanelTabsType,
  path: PanelPath | undefined,
  hasMisconfigurationFindings?: boolean
) => {
  const { openLeftPanel } = useExpandableFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: UserDetailsPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        user,
        isRiskScoreExist,
        hasMisconfigurationFindings,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
