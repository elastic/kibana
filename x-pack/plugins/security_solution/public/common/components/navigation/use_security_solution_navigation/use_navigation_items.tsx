/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';
import { navTabGroups } from '../../../../app/home/home_navigations';
import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useFormatUrl } from '../../link_to';
import { NavTab } from '../types';

export const usePrimaryNavigationItems = ({
  navTabs,
  ...props
}: PrimaryNavigationItemsProps): Array<EuiSideNavItemType<{}>> => {
  return [
    {
      id: APP_ID,
      name: '',
      items: [
        useSideNavItem({ ...props, tab: navTabs.overview }),
        // TODO: [1101] Move the following nav items to its group
        useSideNavItem({ ...props, tab: navTabs.detections }),
        useSideNavItem({ ...props, tab: navTabs.hosts }),
        useSideNavItem({ ...props, tab: navTabs.network }),
        useSideNavItem({ ...props, tab: navTabs.timelines }),
        useSideNavItem({ ...props, tab: navTabs.case }),
        useSideNavItem({ ...props, tab: navTabs.administration }),
      ],
    },
    {
      ...navTabGroups.detect,
      items: [
        //     useSideNavItem({ ...props, tab: navTabs.alerts}),
        //     useSideNavItem({ ...props, tab: navTabs.rules}),
        //     useSideNavItem({ ...props, tab: navTabs.exceptions}),
      ],
    },
    {
      ...navTabGroups.explore,
      items: [],
    },
    {
      ...navTabGroups.investigate,
      items: [],
    },
    {
      ...navTabGroups.manage,
      items: [],
    },
  ];
};

type SideNavItemProps = { tab: NavTab } & Omit<PrimaryNavigationItemsProps, 'navTabs'>;
const useSideNavItem = ({
  tab,
  filters,
  query,
  savedQuery,
  selectedTabId,
  sourcerer,
  timeline,
  timerange,
}: SideNavItemProps): EuiSideNavItemType<{}> & { 'data-href': string } => {
  const { id, href, name, disabled, pageId } = tab;

  const history = useHistory();
  const { navigateToApp, getUrlForApp } = useKibana().services.application;
  const { formatUrl } = useFormatUrl(((pageId ?? id) as unknown) as SecurityPageName);

  const isSelected = selectedTabId === id;
  const urlSearch = getSearch(tab, {
    filters,
    query,
    savedQuery,
    sourcerer,
    timeline,
    timerange,
  });
  const hrefWithSearch =
    tab.href + getSearch(tab, { filters, query, savedQuery, sourcerer, timeline, timerange });

  const handleClick = (ev: React.MouseEvent) => {
    ev.preventDefault();
    if (id in SecurityPageName && pageId == null) {
      // TODO: [1101] remove condition and use deepLinkId for all sections when all migrated
      if (id === 'overview' || id === 'hosts') {
        navigateToApp(APP_ID, { deepLinkId: id, path: urlSearch });
      } else {
        navigateToApp(`${APP_ID}:${id}`, { path: urlSearch });
      }
    } else {
      history.push(hrefWithSearch);
    }
    track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
  };

  const appHref =
    pageId != null
      ? formatUrl(href)
      : getUrlForApp(`${APP_ID}:${id}`, {
          path: urlSearch,
        });

  return {
    'data-href': appHref,
    'data-test-subj': `navigation-${id}`,
    disabled,
    href: appHref,
    id,
    isSelected,
    name,
    onClick: handleClick,
  };
};
