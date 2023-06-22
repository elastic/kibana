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
  EuiTab,
  EuiSpacer,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { LinkToUptime } from './links/link_to_uptime';
import { LinkToApmServices } from './links/link_to_apm_services';
import { useLazyRef } from '../../../../../hooks/use_lazy_ref';
import { metadataTab } from './metadata';
import type { InventoryItemType } from '../../../../../../common/inventory_models/types';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { processesTab } from './processes';
import { Metadata } from './metadata/metadata';
import { Processes } from './processes/processes';
import { FlyoutTabIds, useHostFlyoutOpen } from '../../hooks/use_host_flyout_open_url_state';

interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

const flyoutTabs = [metadataTab, processesTab];
const NODE_TYPE = 'host' as InventoryItemType;

export const Flyout = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { euiTheme } = useEuiTheme();

  const currentTimeRange = {
    ...getDateRangeAsTimestamp(),
    interval: '1m',
  };

  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutOpen();

  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([hostFlyoutOpen.selectedTabId]));

  const tabEntries = flyoutTabs.map((tab) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => {
        renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
        setHostFlyoutOpen({ selectedTabId: tab.id });
      }}
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
