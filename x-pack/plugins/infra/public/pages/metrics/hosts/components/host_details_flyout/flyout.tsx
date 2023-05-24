/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { LinkToUptime } from './links/link_to_uptime';
import { LinkToApmServices } from './links/link_to_apm_services';
import type { InventoryItemType } from '../../../../../../common/inventory_models/types';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { Metadata } from './metadata/metadata';
import { Processes } from './processes/processes';
import { FlyoutTabIds } from '../../hooks/use_host_flyout_open_url_state';
import type { Tab } from './flyout_wrapper';
import { metadataTab } from './metadata';
import { processesTab } from './processes';

type FLYOUT_TABS = 'metadata' | 'processes';
export interface FlyoutProps {
  node: HostNodeRow;
  closeFlyout: () => void;
  renderedTabsSet: React.MutableRefObject<Set<FLYOUT_TABS>>;
  currentTimeRange: {
    interval: string;
    from: number;
    to: number;
  };
  hostFlyoutOpen: {
    clickedItemId: string;
    selectedTabId: FLYOUT_TABS;
    searchFilter: string;
    metadataSearch: string;
  };
  onTabClick: (tab: Tab) => void;
}

const NODE_TYPE = 'host' as InventoryItemType;
const flyoutTabs: Tab[] = [metadataTab, processesTab];

export const Flyout = ({
  node,
  closeFlyout,
  onTabClick,
  renderedTabsSet,
  currentTimeRange,
  hostFlyoutOpen,
}: FlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  const tabEntries = flyoutTabs.map((tab) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => onTabClick(tab)}
      isSelected={tab.id === hostFlyoutOpen.selectedTabId}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <EuiFlyout onClose={closeFlyout} ownFocus={false}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{node.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LinkToApmServices hostName={node.name} apmField={'host.hostname'} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              margin-right: ${euiTheme.size.l};
            `}
          >
            <LinkToUptime nodeType={NODE_TYPE} node={node} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs style={{ marginBottom: '-25px' }} size="s">
          {tabEntries}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {renderedTabsSet.current.has(FlyoutTabIds.METADATA) && (
          <div hidden={hostFlyoutOpen.selectedTabId !== FlyoutTabIds.METADATA}>
            <Metadata currentTimeRange={currentTimeRange} node={node} nodeType={NODE_TYPE} />
          </div>
        )}
        {renderedTabsSet.current.has(FlyoutTabIds.PROCESSES) && (
          <div hidden={hostFlyoutOpen.selectedTabId !== FlyoutTabIds.PROCESSES}>
            <Processes node={node} nodeType={NODE_TYPE} currentTime={currentTimeRange.to} />
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
