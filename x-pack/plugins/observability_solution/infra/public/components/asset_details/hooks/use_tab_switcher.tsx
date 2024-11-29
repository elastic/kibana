/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useLazyRef } from '../../../hooks/use_lazy_ref';
import type { TabIds } from '../types';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

interface TabSwitcherParams {
  defaultActiveTabId?: TabIds;
}

export function useTabSwitcher({ defaultActiveTabId }: TabSwitcherParams) {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [activeTabId = defaultActiveTabId, scrollTo] = urlState?.tabId?.split('#') ?? [];

  // This set keeps track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([activeTabId]));

  const showTab = (tabId: TabIds, options?: { scrollTo?: string }) => {
    // On a tab click, mark the tab content as allowed to be rendered
    renderedTabsSet.current.add(tabId);

    setUrlState({
      tabId: options?.scrollTo ? `${tabId}#${options?.scrollTo}` : tabId,
    });
  };

  const setScrollTo = (to: string) => {
    showTab(activeTabId as TabIds, { scrollTo: to });
  };

  const isActiveTab = (tabId: TabIds) => tabId === activeTabId;

  return {
    activeTabId,
    scrollTo,
    renderedTabsSet,
    showTab,
    setScrollTo,
    isActiveTab,
  };
}

export const TabSwitcher = createContainer(useTabSwitcher);
export const [TabSwitcherProvider, useTabSwitcherContext] = TabSwitcher;
