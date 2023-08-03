/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import createContainer from 'constate';
import { useLazyRef } from '../../../hooks/use_lazy_ref';
import type { TabIds } from '../types';
import { useAssetDetailsStateContext } from './use_asset_details_state';

interface TabSwitcherParams {
  initialActiveTabId?: TabIds;
}

export function useTabSwitcher({ initialActiveTabId }: TabSwitcherParams) {
  const { onTabsStateChange } = useAssetDetailsStateContext();
  const [activeTabId, setActiveTabId] = useState<TabIds | undefined>(initialActiveTabId);

  // This set keeps track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([initialActiveTabId]));

  const showTab = (tabId: TabIds) => {
    renderedTabsSet.current.add(tabId); // On a tab click, mark the tab content as allowed to be rendered
    setActiveTabId(tabId);

    if (onTabsStateChange) {
      onTabsStateChange({ activeTabId: tabId });
    }
  };

  return {
    initialActiveTabId,
    activeTabId,
    renderedTabsSet,
    showTab,
  };
}

export const TabSwitcher = createContainer(useTabSwitcher);
export const [TabSwitcherProvider, useTabSwitcherContext] = TabSwitcher;
