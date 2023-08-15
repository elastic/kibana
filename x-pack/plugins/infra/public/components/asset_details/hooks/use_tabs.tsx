/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiIcon, type EuiPageHeaderProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { capitalize } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { FlyoutTabIds, type Tab, TabIds } from '../types';
import { useAssetDetailsStateContext } from './use_asset_details_state';
import { useTabSwitcherContext } from './use_tab_switcher';
import { APM_FIELD } from '../constants';

type TabReturn = NonNullable<Pick<EuiPageHeaderProps, 'tabs'>['tabs']>[number];

const useTabbedLinks = () => {
  const { asset, assetType } = useAssetDetailsStateContext();
  const { share } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();

  const apmTracesMenuItemLinkProps = useLinkProps({
    app: 'apm',
    hash: 'traces',
    search: {
      kuery: `${APM_FIELD}:"${asset.name}"`,
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
        share.url.locators
          .get(uptimeOverviewLocatorID)!
          .navigate({ [assetType]: asset.name, ip: asset.ip }),
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
    [asset.ip, asset.name, assetType, euiTheme.size.xs, share.url.locators]
  );

  return { getTabToApmTraces, getTabToUptime };
};

export const useTabs = (tabs: Tab[]): { tabs: TabReturn[] } => {
  const { showTab, activeTabId } = useTabSwitcherContext();
  const { getTabToApmTraces, getTabToUptime } = useTabbedLinks();

  const onTabClick = useCallback(
    (tabId: TabIds) => {
      showTab(tabId);
    },
    [showTab]
  );

  const tabbedLinks = useMemo(
    () => ({
      [FlyoutTabIds.LINK_TO_APM]: getTabToApmTraces,
      [FlyoutTabIds.LINK_TO_UPTIME]: getTabToUptime,
    }),
    [getTabToApmTraces, getTabToUptime]
  );

  const tabEntries = useMemo(
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

  return { tabs: tabEntries };
};
