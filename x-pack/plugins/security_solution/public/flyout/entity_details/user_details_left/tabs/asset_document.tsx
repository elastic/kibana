/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useState, useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JsonTab } from '../../../document_details/right/tabs/json_tab';
import { TableTab } from '../../../document_details/right/tabs/table_tab';
import { FLYOUT_BODY_TEST_ID, JSON_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import { FlyoutBody } from '../../../shared/components/flyout_body';
export type RightPanelPaths = 'overview' | 'table' | 'json';

export interface AssetDocumentPanelProps extends FlyoutPanelProps {
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
  };
}

const tabs = [
  {
    id: TABLE_TAB_TEST_ID,
    'data-test-subj': TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.userDetails.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab />,
  },
  {
    id: JSON_TAB_TEST_ID,
    'data-test-subj': JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.userDetails.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: <JsonTab />,
  },
];

const useFilterOptions = (): EuiButtonGroupOptionProps[] =>
  useMemo(
    () =>
      tabs.map((tab) => {
        return {
          id: tab.id,
          label: tab.name,
        };
      }),
    []
  );

export const AssetDocumentTab: FC<Partial<AssetDocumentPanelProps>> = memo(() => {
  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const buttonButtons = useFilterOptions();
  const selectedTab = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId);
  }, [selectedTabId]);

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.userDetails.tabsLegend',
          {
            defaultMessage: 'Asset document tabs',
          }
        )}
        options={buttonButtons}
        idSelected={selectedTabId}
        onChange={setSelectedTabId}
        buttonSize="compressed"
        isFullWidth
      />
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>{selectedTab?.content}</FlyoutBody>
    </>
  );
});

AssetDocumentTab.displayName = 'AssetDocumentLeftPanel';
