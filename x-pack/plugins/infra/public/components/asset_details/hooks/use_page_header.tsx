/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  useEuiTheme,
  EuiIcon,
  type EuiPageHeaderProps,
  type EuiBreadcrumbsProps,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { APM_HOST_FILTER_FIELD } from '../constants';
import { LinkToAlertsRule, LinkToApmServices, LinkToNodeDetails } from '../links';
import { FlyoutTabIds, type RouteState, type LinkOptions, type Tab, type TabIds } from '../types';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { useDateRangeProviderContext } from './use_date_range';
import { useTabSwitcherContext } from './use_tab_switcher';

type TabItem = NonNullable<Pick<EuiPageHeaderProps, 'tabs'>['tabs']>[number];

export const usePageHeader = (tabs: Tab[] = [], links: LinkOptions[] = []) => {
  const { rightSideItems } = useRightSideItems(links);
  const { tabEntries } = useTabs(tabs);
  const { breadcrumbs } = useTemplateHeaderBreadcrumbs();

  return { rightSideItems, tabEntries, breadcrumbs };
};

export const useTemplateHeaderBreadcrumbs = () => {
  const history = useHistory();
  const location = useLocation<RouteState>();
  const {
    services: {
      application: { navigateToApp },
    },
  } = useKibanaContextForPlugin();

  const onClick = (e: React.MouseEvent) => {
    if (location.state) {
      navigateToApp(location.state.originAppId, {
        replace: true,
        path: `${location.state.originPathname}${location.state.originData}`,
      });
    } else {
      history.goBack();
    }
    e.preventDefault();
  };

  const breadcrumbs: EuiBreadcrumbsProps['breadcrumbs'] =
    // If there is a state object in location, it's persisted in case the page is opened in a new tab or after page refresh
    // With that, we can show the return button. Otherwise, it will be hidden (ex: the user opened a shared URL or opened the page from their bookmarks)
    location.state || history.length > 1
      ? [
          {
            text: (
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem>
                  <EuiIcon size="s" type="arrowLeft" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.infra.assetDetails.header.return"
                    defaultMessage="Return"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            color: 'primary',
            'aria-current': false,
            'data-test-subj': 'infraAssetDetailsReturnButton',
            href: '#',
            onClick,
          },
        ]
      : [];

  return { breadcrumbs };
};

const useRightSideItems = (links?: LinkOptions[]) => {
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const { asset, assetType, overrides } = useAssetDetailsRenderPropsContext();

  const topCornerLinkComponents: Record<LinkOptions, JSX.Element> = useMemo(
    () => ({
      nodeDetails: (
        <LinkToNodeDetails
          asset={asset}
          assetType={assetType}
          dateRangeTimestamp={getDateRangeInTimestamp()}
        />
      ),
      alertRule: <LinkToAlertsRule onClick={overrides?.alertRule?.onCreateRuleClick} />,
      apmServices: <LinkToApmServices assetName={asset.name} apmField={APM_HOST_FILTER_FIELD} />,
    }),
    [asset, assetType, getDateRangeInTimestamp, overrides?.alertRule?.onCreateRuleClick]
  );

  const rightSideItems = useMemo(
    () => links?.map((link) => topCornerLinkComponents[link]),
    [links, topCornerLinkComponents]
  );

  return { rightSideItems };
};

const useTabs = (tabs: Tab[]) => {
  const { showTab, activeTabId } = useTabSwitcherContext();
  const { asset } = useAssetDetailsRenderPropsContext();
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

  const tabEntries: TabItem[] = useMemo(
    () =>
      tabs.map(({ name, ...tab }) => {
        if (tab.id === FlyoutTabIds.LINK_TO_APM) {
          return getTabToApmTraces(name);
        }

        return {
          ...tab,
          'data-test-subj': `infraAssetDetails${capitalize(tab.id)}Tab`,
          onClick: () => onTabClick(tab.id),
          isSelected: tab.id === activeTabId,
          label: name,
        };
      }),
    [activeTabId, getTabToApmTraces, onTabClick, tabs]
  );

  return { tabEntries };
};
