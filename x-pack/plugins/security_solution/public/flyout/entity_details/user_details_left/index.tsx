/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useManagedUser } from '../../../timelines/components/side_panel/new_user_detail/hooks/use_managed_user';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabsType, UserDetailsLeftPanelTab } from './tabs';
import { useTabs } from './tabs';
import { FlyoutLoading } from '../../shared/components/flyout_loading';

interface RiskInputsParam {
  alertIds: string[];
}

interface UserParam {
  name: string;
  email: string[];
}

export interface UserDetailsPanelProps extends Record<string, unknown> {
  riskInputs: RiskInputsParam;
  user: UserParam;
  path?: PanelPath;
}
export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user_details';
  params: UserDetailsPanelProps;
}
export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user_details';

export const UserDetailsPanel = ({ riskInputs, user, path }: UserDetailsPanelProps) => {
  const managedUser = useManagedUser(user.name, user.email);
  const tabs = useTabs(managedUser.data, riskInputs.alertIds);
  const { selectedTabId, setSelectedTabId } = useSelectedTab(riskInputs, user, tabs, path);

  if (managedUser.isLoading) return <FlyoutLoading />;

  return (
    <>
      <PanelHeader selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} tabs={tabs} />
      <PanelContent selectedTabId={selectedTabId} tabs={tabs} />
    </>
  );
};

const useSelectedTab = (
  riskInputs: RiskInputsParam,
  user: UserParam,
  tabs: LeftPanelTabsType,
  path: PanelPath | undefined
) => {
  const { openLeftPanel } = useExpandableFlyoutContext();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs[0].id;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: UserDetailsLeftPanelTab) => {
    openLeftPanel({
      id: UserDetailsPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        riskInputs,
        user,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
