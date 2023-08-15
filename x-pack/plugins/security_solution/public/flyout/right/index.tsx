/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from './context';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { RightPanelTabsType } from './tabs';
import { tabs } from './tabs';
import { PanelFooter } from './footer';

export type RightPanelPaths = 'overview' | 'table' | 'json';
export const RightPanelKey: RightPanelProps['key'] = 'document-details-right';

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
  const { openRightPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId } = useRightPanelContext();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs[0].id;
    if (!path) return defaultTab;
    return tabs.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path]);

  const setSelectedTabId = (tabId: RightPanelTabsType[number]['id']) => {
    openRightPanel({
      id: RightPanelKey,
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

  return (
    <>
      <PanelHeader selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} />
      <PanelContent selectedTabId={selectedTabId} />
      <PanelFooter />
    </>
  );
});

RightPanel.displayName = 'RightPanel';
