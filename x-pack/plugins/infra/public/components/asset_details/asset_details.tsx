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
import Metadata from './metadata/metadata';
import { LinkToUptime } from './links/link_to_uptime';
import { LinkToApmServices } from './links/link_to_apm_services';
// TODO add processes
// import { Processes } from './processes/processes';
import type { HostNodeRow } from './types';
import type { InventoryItemType } from '../../../common/inventory_models/types';
import type { SetNewHostFlyoutOpen } from '../../pages/metrics/hosts/hooks/use_host_flyout_open_url_state';

export enum FlyoutTabIds {
  METADATA = 'metadata',
  PROCESSES = 'processes',
}

type TabIds = 'metadata' | 'processes';

export interface Tab {
  id: FlyoutTabIds;
  name: any;
  'data-test-subj': string;
}

export interface AssetDetailsProps {
  node: HostNodeRow;
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
  setHostFlyoutOpen?: SetNewHostFlyoutOpen;
  onTabClick?: (tab: Tab) => void;
  links?: Array<'uptime' | 'apmServices'>;
  showInFlyout?: boolean;
  showActionsColumn?: boolean;
}

const NODE_TYPE = 'host' as InventoryItemType;

export const AssetDetails = ({
  node,
  closeFlyout,
  onTabClick,
  renderedTabsSet,
  currentTimeRange,
  hostFlyoutOpen,
  setHostFlyoutOpen,
  tabs,
  showInFlyout,
  links,
  showActionsColumn,
}: AssetDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTabId, setSelectedTabId] = useState('metadata');

  const onTabSelectClick = (tab: Tab) => {
    renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
    setSelectedTabId(tab.id);
  };

  const persistMetadataSearchToUrlState =
    setHostFlyoutOpen && hostFlyoutOpen
      ? {
          metadataSearchUrlState: hostFlyoutOpen.metadataSearch,
          setMetadataSearchUrlState: setHostFlyoutOpen,
        }
      : undefined;

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
        <LinkToUptime nodeType={NODE_TYPE} node={node} />
      </EuiFlexItem>
    ),
  };

  const headerLinks = links?.map((link) => linksMapping[link]);

  if (!showInFlyout) {
    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{node.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {links && headerLinks}
        </EuiFlexGroup>
        <EuiTabs
          css={css`
            margin-bottom: 25px;
          `}
          size="s"
        >
          {tabEntries}
        </EuiTabs>
        {renderedTabsSet.current.has(FlyoutTabIds.METADATA) && (
          <div hidden={(hostFlyoutOpen?.selectedTabId ?? selectedTabId) !== FlyoutTabIds.METADATA}>
            <Metadata
              currentTimeRange={currentTimeRange}
              node={node}
              nodeType={NODE_TYPE}
              showActionsColumn={showActionsColumn}
              persistMetadataSearchToUrlState={persistMetadataSearchToUrlState}
            />
          </div>
        )}
        {renderedTabsSet.current.has(FlyoutTabIds.PROCESSES) && (
          <div hidden={(hostFlyoutOpen?.selectedTabId ?? selectedTabId) !== FlyoutTabIds.PROCESSES}>
            {/* <Processes node={node} nodeType={NODE_TYPE} currentTime={currentTimeRange.to} /> */}
          </div>
        )}
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
        {renderedTabsSet.current.has(FlyoutTabIds.METADATA) && (
          <div hidden={(hostFlyoutOpen?.selectedTabId ?? selectedTabId) !== FlyoutTabIds.METADATA}>
            <Metadata
              currentTimeRange={currentTimeRange}
              node={node}
              nodeType={NODE_TYPE}
              showActionsColumn={showActionsColumn}
              persistMetadataSearchToUrlState={persistMetadataSearchToUrlState}
            />
          </div>
        )}
        {renderedTabsSet.current.has(FlyoutTabIds.PROCESSES) && (
          <div hidden={(hostFlyoutOpen?.selectedTabId ?? selectedTabId) !== FlyoutTabIds.PROCESSES}>
            {/* <Processes node={node} nodeType={NODE_TYPE} currentTime={currentTimeRange.to} /> */}
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
