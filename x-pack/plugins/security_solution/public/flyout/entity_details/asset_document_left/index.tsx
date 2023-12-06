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
import { FormattedMessage } from '@kbn/i18n-react';
import { useRightPanelContext } from '../../document_details/right/context';
import { PanelHeader } from '../../document_details/right/header';
import type { RightPanelTabsType } from '../../document_details/right/tabs';
import { PanelContent } from '../../document_details/right/content';
import { JsonTab } from '../../document_details/right/tabs/json_tab';
import { TableTab } from '../../document_details/right/tabs/table_tab';
import { JSON_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
export type RightPanelPaths = 'overview' | 'table' | 'json';
export const AssetDocumentLeftPanelKey: AssetDocumentLeftPanelProps['key'] =
  'asset-document-details-left';

export interface AssetDocumentLeftPanelProps extends FlyoutPanelProps {
  key: 'asset-document-details-left';
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
  };
}

const tabs: RightPanelTabsType = [
  {
    id: 'table',
    'data-test-subj': TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.header.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab />,
  },
  {
    id: 'json',
    'data-test-subj': JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.header.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: <JsonTab />,
  },
];

export const AssetDocumentLeftPanel: FC<Partial<AssetDocumentLeftPanelProps>> = memo(({ path }) => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId } = useRightPanelContext();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs[0].id;
    if (!path) return defaultTab;
    return tabs.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path]);

  const setSelectedTabId = (tabId: string) => {
    openLeftPanel({
      id: AssetDocumentLeftPanelKey,
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
      <PanelHeader tabs={tabs} selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} />
      <PanelContent tabs={tabs} selectedTabId={selectedTabId} />
    </>
  );
});

AssetDocumentLeftPanel.displayName = 'AssetDocumentLeftPanel';
