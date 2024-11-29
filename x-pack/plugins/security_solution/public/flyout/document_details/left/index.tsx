/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING } from '../../../../common/constants';
import { DocumentDetailsLeftPanelKey } from '../shared/constants/panel_keys';
import { useKibana } from '../../../common/lib/kibana';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabType } from './tabs';
import * as tabs from './tabs';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { DocumentEventTypes } from '../../../common/lib/telemetry/types';

export type LeftPanelPaths = 'visualize' | 'insights' | 'investigation' | 'response' | 'notes';
export const LeftPanelVisualizeTab: LeftPanelPaths = 'visualize';
export const LeftPanelInsightsTab: LeftPanelPaths = 'insights';
export const LeftPanelInvestigationTab: LeftPanelPaths = 'investigation';
export const LeftPanelResponseTab: LeftPanelPaths = 'response';
export const LeftPanelNotesTab: LeftPanelPaths = 'notes';

export const LeftPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, getFieldsData, isPreview } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );

  const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
    ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  );

  const tabsDisplayed = useMemo(() => {
    const tabList =
      eventKind === EventKind.signal
        ? [tabs.insightsTab, tabs.investigationTab, tabs.responseTab]
        : [tabs.insightsTab];
    if (!securitySolutionNotesDisabled && !isPreview) {
      tabList.push(tabs.notesTab);
    }
    if (visualizationInFlyoutEnabled && !isPreview) {
      return [tabs.visualizeTab, ...tabList];
    }
    return tabList;
  }, [eventKind, isPreview, securitySolutionNotesDisabled, visualizationInFlyoutEnabled]);

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
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
      location: scopeId,
      panel: 'left',
      tabId,
    });
  };

  return (
    <>
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
