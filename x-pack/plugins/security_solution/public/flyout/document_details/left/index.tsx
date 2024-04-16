/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../../common/lib/kibana';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabType } from './tabs';
import * as tabs from './tabs';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { useLeftPanelContext } from './context';
import { LeftPanelTour } from './components/tour';

export type LeftPanelPaths = 'visualize' | 'insights' | 'investigation' | 'response';
export const DocumentDetailsLeftPanelKey: LeftPanelProps['key'] = 'document-details-left';
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
  const { telemetry } = useKibana().services;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, getFieldsData } = useLeftPanelContext();
  const eventKind = getField(getFieldsData('event.kind'));

  const tabsDisplayed = useMemo(
    () =>
      eventKind === EventKind.signal
        ? [tabs.insightsTab, tabs.investigationTab, tabs.responseTab]
        : [tabs.insightsTab],
    [eventKind]
  );

  const selectedTabId = useMemo(() => {
    const defaultTab = tabsDisplayed[0].id;
    if (!path) return defaultTab;
    return tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path, tabsDisplayed]);

  const setSelectedTabId = (tabId: LeftPanelTabType['id']) => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
    telemetry.reportDetailsFlyoutTabClicked({
      tableId: scopeId,
      panel: 'left',
      tabId,
    });
  };

  return (
    <>
      <LeftPanelTour />
      <PanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabsDisplayed}
      />
      <PanelContent selectedTabId={selectedTabId} tabs={tabsDisplayed} />
    </>
  );
});

LeftPanel.displayName = 'LeftPanel';
