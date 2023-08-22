/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiIcon, type EuiPageHeaderProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useMemo } from 'react';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { capitalize } from 'lodash';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { APM_HOST_FILTER_FIELD } from '../constants';
import { LinkToAlertsRule, LinkToApmServices, LinkToNodeDetails, LinkToUptime } from '../links';
import { FlyoutTabIds, type LinkOptions, type Tab, type TabIds } from '../types';
import { useAssetDetailsStateContext } from './use_asset_details_state';
import { useDateRangeProviderContext } from './use_date_range';
import { useTabSwitcherContext } from './use_tab_switcher';
import { useMetadataStateProviderContext } from './use_metadata_state';

type TabItem = NonNullable<Pick<EuiPageHeaderProps, 'tabs'>['tabs']>[number];

export const usePageHeader = (tabs: Tab[], links?: LinkOptions[]) => {
  const { rightSideItems } = useRightSideItems(links);
  const { tabEntries } = useTabs(tabs);

  return { rightSideItems, tabEntries };
};

const useRightSideItems = (links?: LinkOptions[]) => {
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const { asset, assetType, overrides } = useAssetDetailsStateContext();
  const { metadata } = useMetadataStateProviderContext();

  const topCornerLinkComponents: Record<LinkOptions, JSX.Element> = useMemo(
    () => ({
      nodeDetails: (
        <LinkToNodeDetails
          asset={asset}
          assetType={assetType}
          currentTimestamp={getDateRangeInTimestamp().to}
        />
      ),
      alertRule: <LinkToAlertsRule onClick={overrides?.alertRule?.onCreateRuleClick} />,
      apmServices: <LinkToApmServices assetName={asset.name} apmField={APM_HOST_FILTER_FIELD} />,
      uptime: (
        <LinkToUptime
          assetName={asset.name}
          assetType={assetType}
          ip={
            (Array.isArray(metadata?.info?.host?.ip)
              ? metadata?.info?.host?.ip ?? []
              : [metadata?.info?.host?.ip])[0]
          }
        />
      ),
    }),
    [
      asset,
      assetType,
      getDateRangeInTimestamp,
      metadata?.info?.host?.ip,
      overrides?.alertRule?.onCreateRuleClick,
    ]
  );

  const rightSideItems = useMemo(
    () => links?.map((link) => topCornerLinkComponents[link]),
    [links, topCornerLinkComponents]
  );

  return { rightSideItems };
};

const useTabs = (tabs: Tab[]) => {
  const { showTab, activeTabId } = useTabSwitcherContext();
  const { asset, assetType } = useAssetDetailsStateContext();
  const { metadata } = useMetadataStateProviderContext();
  const { share } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();

  const onTabClick = useCallback(
    (tabId: TabIds) => {
      showTab(tabId);
    },
    [showTab]
  );

  const apmTracesMenuItemLinkProps = useLinkProps({
    app: 'apm',
    hash: 'traces',
    search: {
      kuery: `${APM_HOST_FILTER_FIELD}:"${asset.name}"`,
    },
  });

  const getTabToApmTraces = useCallback(
    (name: string) => ({
      ...apmTracesMenuItemLinkProps,
      'data-test-subj': 'infraAssetDetailsApmServicesLinkTab',
      label: (
        <>
          <EuiIcon
            type="popout"
            css={css`
              margin-right: ${euiTheme.size.xs};
            `}
          />
          {name}
        </>
      ),
    }),
    [apmTracesMenuItemLinkProps, euiTheme.size.xs]
  );

  const getTabToUptime = useCallback(
    (name: string) => ({
      'data-test-subj': 'infraAssetDetailsUptimeLinkTab',
      onClick: () =>
        share.url.locators.get(uptimeOverviewLocatorID)!.navigate({
          [assetType]: asset.id,
          ip: (Array.isArray(metadata?.info?.host?.ip)
            ? metadata?.info?.host?.ip ?? []
            : [metadata?.info?.host?.ip])[0],
        }),
      label: (
        <>
          <EuiIcon
            type="popout"
            css={css`
              margin-right: ${euiTheme.size.xs};
            `}
          />
          {name}
        </>
      ),
    }),
    [asset.id, assetType, euiTheme.size.xs, metadata?.info?.host?.ip, share.url.locators]
  );

  const tabbedLinks = useMemo(
    () => ({
      [FlyoutTabIds.LINK_TO_APM]: getTabToApmTraces,
      [FlyoutTabIds.LINK_TO_UPTIME]: getTabToUptime,
    }),
    [getTabToApmTraces, getTabToUptime]
  );

  const tabEntries: TabItem[] = useMemo(
    () =>
      tabs.map(({ name, ...tab }) => {
        if (Object.keys(tabbedLinks).includes(tab.id)) {
          return tabbedLinks[tab.id as keyof typeof tabbedLinks](name);
        }

        if (tab.id === FlyoutTabIds.LINK_TO_APM) {
          return getTabToUptime(name);
        }

        return {
          ...tab,
          'data-test-subj': `infraAssetDetails${capitalize(tab.id)}Tab`,
          onClick: () => onTabClick(tab.id),
          isSelected: tab.id === activeTabId,
          label: name,
        };
      }),
    [activeTabId, getTabToUptime, onTabClick, tabbedLinks, tabs]
  );

  return { tabEntries };
};
