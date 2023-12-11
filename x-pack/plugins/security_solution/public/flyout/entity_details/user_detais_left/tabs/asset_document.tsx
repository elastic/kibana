/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useState } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import type { RightPanelTabsType } from '../../../document_details/right/tabs';
import { PanelContent } from '../../../document_details/right/content';
import { JsonTab } from '../../../document_details/right/tabs/json_tab';
import { TableTab } from '../../../document_details/right/tabs/table_tab';
import { JSON_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
export type RightPanelPaths = 'overview' | 'table' | 'json';

export interface AssetDocumentPanelProps extends FlyoutPanelProps {
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

enum ASSET_DOCUMENT_TABS {
  TABLE = 'table',
  JSON = 'json',
}

const buttonButtons: EuiButtonGroupOptionProps[] = [
  {
    id: ASSET_DOCUMENT_TABS.TABLE,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.entitiesButtonLabel"
        defaultMessage="Table"
      />
    ),
    // 'data-test-subj': INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  },
  {
    id: ASSET_DOCUMENT_TABS.JSON,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.threatIntelligenceButtonLabel"
        defaultMessage="JSON"
      />
    ),
    // 'data-test-subj': INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  },
];

export const AssetDocumentTab: FC<Partial<AssetDocumentPanelProps>> = memo(() => {
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={'test 1 2 3'}
        options={buttonButtons}
        idSelected={selectedTabId}
        onChange={setSelectedTabId}
        buttonSize="compressed"
        isFullWidth
        // data-test-subj={INSIGHTS_TAB_BUTTON_GROUP_TEST_ID}
      />
      <PanelContent tabs={tabs} selectedTabId={selectedTabId} />
    </>
  );
});

AssetDocumentTab.displayName = 'AssetDocumentLeftPanel';
