/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import type { HostNodeRow } from './types';
import type { InventoryItemType } from '../../../common/inventory_models/types';
import type { SetNewHostFlyoutOpen } from '../../pages/metrics/hosts/hooks/use_host_flyout_open_url_state';
import { AssetDetailsTabContent } from './tabs_content/tabs_content';

export enum FlyoutTabIds {
  METADATA = 'metadata',
  PROCESSES = 'processes',
}

export type TabIds = `${FlyoutTabIds}`;

export interface Tab {
  id: FlyoutTabIds;
  name: string;
  'data-test-subj': string;
}

export interface AssetDetailsProps {
  node: HostNodeRow;
  nodeType: InventoryItemType;
  closeFlyout: () => void;
  renderedTabsSet: React.MutableRefObject<Set<TabIds>>;
  currentTimeRange: {
    interval: string;
    from: number;
    to: number;
  };
  tabs: Tab[];
  hostFlyoutOpen?: {
    clickedItemId: string;
    selectedTabId: TabIds;
    searchFilter: string;
    metadataSearch: string;
  };
  setHostFlyoutState?: SetNewHostFlyoutOpen;
  onTabClick?: (tab: Tab) => void;
  links?: Array<'uptime' | 'apmServices'>;
  showInFlyout?: boolean;
  showActionsColumn?: boolean;
}

// Setting host as default as it will be the only supported type for now
const NODE_TYPE = 'host' as InventoryItemType;

export const AssetDetails = ({
  node,
  closeFlyout,
  onTabClick,
  renderedTabsSet,
  currentTimeRange,
  hostFlyoutOpen,
  setHostFlyoutState,
  tabs,
  showInFlyout,
  links,
  showActionsColumn,
  nodeType = NODE_TYPE,
}: AssetDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTabId, setSelectedTabId] = useState<TabIds>('metadata');

  const onTabSelectClick = (tab: Tab) => {
    renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
    setSelectedTabId(tab.id);
  };

  const tabEntries = tabs.map((tab) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => (onTabClick ? onTabClick(tab) : onTabSelectClick(tab))}
      isSelected={tab.id === hostFlyoutOpen?.selectedTabId ?? selectedTabId}
    >
      {tab.name}
    </EuiTab>
  ));

  const linksMapping = {
    apmServices: (
      <EuiFlexItem grow={false}>
        <LinkToApmServices hostName={node.name} apmField={'host.hostname'} />
      </EuiFlexItem>
    ),
    uptime: (
      <EuiFlexItem
        grow={false}
        css={css`
          margin-right: ${euiTheme.size.l};
        `}
      >
        <LinkToUptime nodeType={nodeType} node={node} />
      </EuiFlexItem>
    ),
  };

  const headerLinks = links?.map((link) => linksMapping[link]);

  if (!showInFlyout) {
    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{node.name}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {links && headerLinks}
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiTabs
          css={css`
            margin-right: ${euiTheme.size.l};
          `}
          size="l"
        >
          {tabEntries}
        </EuiTabs>
        <EuiSpacer size="l" />
        <AssetDetailsTabContent
          node={node}
          nodeType={nodeType}
          currentTimeRange={currentTimeRange}
          hostFlyoutOpen={hostFlyoutOpen}
          showActionsColumn={showActionsColumn}
          renderedTabsSet={renderedTabsSet}
          selectedTabId={hostFlyoutOpen?.selectedTabId ?? selectedTabId}
          setHostFlyoutState={setHostFlyoutState}
        />
      </>
    );
  }

  return (
    <EuiFlyout onClose={closeFlyout} ownFocus={false}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{node.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {links && headerLinks}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs
          css={css`
            margin-bottom: -25px;
          `}
          size="s"
        >
          {tabEntries}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AssetDetailsTabContent
          node={node}
          nodeType={nodeType}
          currentTimeRange={currentTimeRange}
          hostFlyoutOpen={hostFlyoutOpen}
          showActionsColumn={showActionsColumn}
          renderedTabsSet={renderedTabsSet}
          selectedTabId={hostFlyoutOpen?.selectedTabId ?? selectedTabId}
          setHostFlyoutState={setHostFlyoutState}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
