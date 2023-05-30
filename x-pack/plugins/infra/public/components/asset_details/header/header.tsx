/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTabs,
  EuiTab,
  useEuiTheme,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiShowFor } from '@elastic/eui';
import type { AssetDetailsProps } from '../types';
import { LinkToApmServices } from '../links/link_to_apm_services';
import { LinkToUptime } from '../links/link_to_uptime';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import type { TabIds } from '../types';
type Props = Pick<
  AssetDetailsProps,
  'node' | 'nodeType' | 'links' | 'tabs' | 'onTabsStateChange'
> & {
  compact: boolean;
};

export const Header = ({ nodeType, node, tabs, links, compact, onTabsStateChange }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { showTab, activeTabId } = useTabSwitcherContext();

  const onTabClick = (tabId: TabIds) => {
    if (onTabsStateChange) {
      onTabsStateChange({ activeTabId: tabId });
    }

    showTab(tabId);
  };

  const tabEntries = tabs.map((tab) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => onTabClick(tab.id)}
      isSelected={tab.id === activeTabId}
    >
      {tab.name}
    </EuiTab>
  ));

  const linkComponent = {
    apmServices: <LinkToApmServices hostName={node.name} apmField={'host.hostname'} />,
    uptime: <LinkToUptime nodeType={nodeType} node={node} />,
  };

  const headerLinks = links?.map((link) => (
    <EuiFlexItem grow={false}>{linkComponent[link]}</EuiFlexItem>
  ));

  return (
    <>
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
        {!compact && (
          <EuiShowFor sizes={['l', 'xl']}>
            <EuiFlexItem grow={1} />
          </EuiShowFor>
        )}
        <EuiFlexItem
          grow
          css={css`
            ${useEuiMaxBreakpoint('l')} {
              align-items: flex-start;
            }
          `}
        >
          <EuiTitle size={compact ? 'xs' : 'l'}>
            <h1>{node.name}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          grow={compact ? 0 : 1}
          css={css`
            align-items: flex-start;
            ${useEuiMinBreakpoint('m')} {
              align-items: flex-end;
            }
          `}
        >
          <EuiFlexGroup
            gutterSize="m"
            responsive={false}
            justifyContent="flexEnd"
            alignItems="center"
            css={css`
              margin-right: ${compact ? euiTheme.size.l : 0};
            `}
          >
            {headerLinks}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={compact ? 's' : 'l'} />
      <EuiTabs
        bottomBorder={!compact}
        css={css`
          margin-bottom: calc(${compact ? '-1 *' : ''} (${euiTheme.size.l} + 1px));
        `}
        size={compact ? 's' : 'l'}
      >
        {tabEntries}
      </EuiTabs>
    </>
  );
};
