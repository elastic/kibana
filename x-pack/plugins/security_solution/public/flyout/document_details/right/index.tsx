/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useTabs } from './hooks/use_tabs';
import { FLYOUT_STORAGE_KEYS } from '../shared/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { useRightPanelContext } from './context';
import { PanelNavigation } from './navigation';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { RightPanelTabType } from './tabs';
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
  const { storage, telemetry } = useKibana().services;
  const { openRightPanel, closeFlyout } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isPreview, dataAsNestedObject, getFieldsData } =
    useRightPanelContext();

  // if the flyout is expandable we render all 3 tabs (overview, table and json)
  // if the flyout is not, we render only table and json
  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });
  const { tabsDisplayed, selectedTabId } = useTabs({ flyoutIsExpandable, path });

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

    // saving which tab is currently selected in the right panel in local storage
    storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);

    telemetry.reportDetailsFlyoutTabClicked({
      tableId: scopeId,
      panel: 'right',
      tabId,
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
