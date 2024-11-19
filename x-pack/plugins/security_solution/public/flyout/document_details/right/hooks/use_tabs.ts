/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PanelPath } from '@kbn/expandable-flyout';
import type { RightPanelPaths } from '..';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';
import * as tabs from '../tabs';
import type { RightPanelTabType } from '../tabs';

export const allThreeTabs = [tabs.overviewTab, tabs.tableTab, tabs.jsonTab];
export const twoTabs = [tabs.tableTab, tabs.jsonTab];

export interface UseTabsParams {
  /**
   * Whether the flyout is expandable or not. This will drive how many tabs we display.
   */
  flyoutIsExpandable: boolean;
  /**
   * The path passed in when using the expandable flyout API to open a panel.
   */
  path: PanelPath | undefined;
}

export interface UseTabsResult {
  /**
   * The tabs to display in the right panel.
   */
  tabsDisplayed: RightPanelTabType[];
  /**
   * The tab id to selected in the right panel.
   */
  selectedTabId: RightPanelPaths;
}

/**
 * Hook to get the tabs to display in the right panel and the selected tab.
 */
export const useTabs = ({ flyoutIsExpandable, path }: UseTabsParams): UseTabsResult => {
  const { storage } = useKibana().services;

  // if the flyout is expandable we render all 3 tabs (overview, table and json)
  // if the flyout is not, we render only table and json
  const tabsDisplayed = useMemo(
    () => (flyoutIsExpandable ? allThreeTabs : twoTabs),
    [flyoutIsExpandable]
  );

  const selectedTabId = useMemo(() => {
    // we use the value passed from the url and use it if it exists in the list of tabs to display
    if (path) {
      const selectedTab = tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab);
      if (selectedTab) {
        return selectedTab;
      }
    }

    // we check the tab saved in local storage and use it if it exists in the list of tabs to display
    const tabSavedInlocalStorage = storage.get(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS);
    if (
      tabSavedInlocalStorage &&
      tabsDisplayed.map((tab) => tab.id).includes(tabSavedInlocalStorage)
    ) {
      return tabSavedInlocalStorage;
    }

    // we default back to the first tab of the list of tabs to display in case everything else has failed
    const defaultTab = tabsDisplayed[0].id;
    return defaultTab;
  }, [path, storage, tabsDisplayed]);

  return {
    tabsDisplayed,
    selectedTabId,
  };
};
