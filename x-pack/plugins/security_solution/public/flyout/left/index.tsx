/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { useEuiBackgroundColor } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabsType } from './tabs';
import { tabs } from './tabs';
import { useLeftPanelContext } from './context';

export type LeftPanelPaths = 'visualize' | 'insights' | 'investigation' | 'response';
export const LeftPanelKey: LeftPanelProps['key'] = 'document-details-left';
export const LeftPanelVisualizeTab: LeftPanelPaths = 'visualize';
export const LeftPanelInsightsTab: LeftPanelPaths = 'insights';
export const LeftPanelInvestigationTab: LeftPanelPaths = 'investigation';
export const LeftPanelResponseTab: LeftPanelPaths = 'response';

export interface LeftPanelProps extends FlyoutPanelProps {
  key: 'document-details-left';
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
  };
}

export const LeftPanel: FC<Partial<LeftPanelProps>> = memo(({ path }) => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId } = useLeftPanelContext();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs[0].id;
    if (!path) return defaultTab;
    return tabs.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path]);

  const setSelectedTabId = (tabId: LeftPanelTabsType[number]['id']) => {
    openLeftPanel({
      id: LeftPanelKey,
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
    <div
      css={css`
        height: 100%;
        background: ${useEuiBackgroundColor('subdued')};
      `}
    >
      <PanelHeader selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} />
      <PanelContent selectedTabId={selectedTabId} />
    </div>
  );
});

LeftPanel.displayName = 'LeftPanel';
