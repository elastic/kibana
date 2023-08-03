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
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { capitalize } from 'lodash';
import { AssetDetailsProps, FlyoutTabIds, LinkOptions, Tab, TabIds } from '../types';
import {
  LinkToApmServices,
  LinkToAlertsRule,
  LinkToNodeDetails,
  TabToApmTraces,
  TabToUptime,
} from '../links';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { useAssetDetailsStateContext } from '../hooks/use_asset_details_state';
import { toTimestampRange } from '../utils';

type Props = Pick<AssetDetailsProps, 'links' | 'tabs'> & {
  compact: boolean;
};

const APM_FIELD = 'host.hostname';

export const Header = ({ tabs = [], links = [], compact }: Props) => {
  const { asset, assetType, overrides, dateRange: timeRange } = useAssetDetailsStateContext();
  const { euiTheme } = useEuiTheme();
  const { showTab, activeTabId } = useTabSwitcherContext();

  const onTabClick = (tabId: TabIds) => {
    showTab(tabId);
  };

  const tabLinkComponents = {
    [FlyoutTabIds.LINK_TO_APM]: (tab: Tab) => (
      <TabToApmTraces assetName={asset.name} apmField={APM_FIELD} {...tab} />
    ),
    [FlyoutTabIds.LINK_TO_UPTIME]: (tab: Tab) => (
      <TabToUptime assetName={asset.name} assetType={assetType} nodeIp={asset.ip} {...tab} />
    ),
  };

  const topCornerLinkComponents: Record<LinkOptions, JSX.Element> = {
    nodeDetails: (
      <LinkToNodeDetails
        assetName={asset.name}
        assetType={assetType}
        currentTimestamp={toTimestampRange(timeRange).to}
      />
    ),
    alertRule: <LinkToAlertsRule onClick={overrides?.alertRule?.onCreateRuleClick} />,
    apmServices: <LinkToApmServices assetName={asset.name} apmField={APM_FIELD} />,
  };

  const tabEntries = tabs.map(({ name, ...tab }) => {
    if (Object.keys(tabLinkComponents).includes(tab.id)) {
      return (
        <React.Fragment key={tab.id}>
          {tabLinkComponents[tab.id as keyof typeof tabLinkComponents]({ name, ...tab })}
        </React.Fragment>
      );
    }

    return (
      <EuiTab
        {...tab}
        data-test-subj={`infraAssetDetails${capitalize(tab.id)}Tab`}
        key={tab.id}
        onClick={() => onTabClick(tab.id)}
        isSelected={tab.id === activeTabId}
      >
        {name}
      </EuiTab>
    );
  });

  return (
    <>
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" direction="row">
        <EuiFlexItem
          grow
          css={css`
            overflow: hidden;
            & h4 {
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
              width: calc(100%);
            }
          `}
        >
          <EuiTitle size={compact ? 'xs' : 'm'}>
            {compact ? <h4>{asset.name}</h4> : <h1>{asset.name}</h1>}
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
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
            {links?.map((link, index) => (
              <EuiFlexItem key={index} grow={false}>
                {topCornerLinkComponents[link]}
              </EuiFlexItem>
            ))}
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
