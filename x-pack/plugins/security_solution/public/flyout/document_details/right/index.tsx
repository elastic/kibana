/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useEffect } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useRightPanelContext } from './context';
import { PanelNavigation } from './navigation';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { RightPanelTabType } from './tabs';
import * as tabs from './tabs';
import { PanelFooter } from './footer';
import { useFlyoutIsExpandable } from './hooks/use_flyout_is_expandable';

export type RightPanelPaths = 'overview' | 'table' | 'json';
export const DocumentDetailsRightPanelKey: RightPanelProps['key'] = 'document-details-right';

export interface RightPanelProps extends FlyoutPanelProps {
  key: 'document-details-right';
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
  };
}

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const RightPanel: FC<Partial<RightPanelProps>> = memo(({ path }) => {
  const { openRightPanel, closeFlyout } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isPreview, dataAsNestedObject, getFieldsData } =
    useRightPanelContext();

  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });
  const tabsDisplayed = useMemo(() => {
    return flyoutIsExpandable
      ? [tabs.overviewTab, tabs.tableTab, tabs.jsonTab]
      : [tabs.tableTab, tabs.jsonTab];
  }, [flyoutIsExpandable]);

  const selectedTabId = useMemo(() => {
    const defaultTab = tabsDisplayed[0].id;
    if (!path) return defaultTab;
    return tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path, tabsDisplayed]);

  const setSelectedTabId = (tabId: RightPanelTabType['id']) => {
    openRightPanel({
      id: DocumentDetailsRightPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  };

  // If flyout is open in preview mode, do not reload with stale information
  useEffect(() => {
    const beforeUnloadHandler = () => {
      if (isPreview) {
        closeFlyout();
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [isPreview, closeFlyout]);

  return (
    <>
      <PanelNavigation flyoutIsExpandable={flyoutIsExpandable} />
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PanelFooter isPreview={isPreview} />
    </>
  );
});

RightPanel.displayName = 'RightPanel';
