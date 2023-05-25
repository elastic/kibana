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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { AssetDetailsProps } from '../asset_details';
import { LinkToApmServices } from '../links/link_to_apm_services';
import { LinkToUptime } from '../links/link_to_uptime';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { TabIds } from '../types';
type Props = Pick<
  AssetDetailsProps,
  'node' | 'nodeType' | 'links' | 'tabs' | 'onTabsStateChange'
> & {
  inFlyout: boolean;
};

export const Header = ({ nodeType, node, tabs, links, inFlyout, onTabsStateChange }: Props) => {
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
    apmServices: (
      <EuiFlexItem grow={false}>
        <LinkToApmServices hostName={node.name} apmField={'host.hostname'} />
      </EuiFlexItem>
    ),
    uptime: (
      <EuiFlexItem grow={false}>
        <LinkToUptime nodeType={nodeType} node={node} />
      </EuiFlexItem>
    ),
  };

  const headerLinks = links?.map((link) => linkComponent[link]);

  return (
    <>
      <TitleContainer>
        <EuiTitle size={inFlyout ? 'xs' : 'l'}>
          <h1>{node.name}</h1>
        </EuiTitle>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          responsive={false}
          css={css`
            position: absolute;
            top: ${euiTheme.size.xxs};
            right: 0;
            margin-right: ${inFlyout ? euiTheme.size.l : 0};
          `}
        >
          {headerLinks}
        </EuiFlexGroup>
      </TitleContainer>
      <EuiSpacer size={inFlyout ? 's' : 'l'} />
      <EuiTabs
        bottomBorder={false}
        css={css`
          margin-bottom: calc((${euiTheme.size.l} + 1px) ${inFlyout ? '* -1' : ''});
        `}
        size={inFlyout ? 's' : 'l'}
      >
        {tabEntries}
      </EuiTabs>
    </>
  );
};

const TitleContainer = euiStyled.div`
  position: relative;
`;
