/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';
import { navTabGroups } from '../../../../app/home/home_navigations';
import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana';
import { NavTab } from '../types';

export const usePrimaryNavigationItems = ({
  navTabs,
  selectedTabId,
  ...props
}: PrimaryNavigationItemsProps): Array<EuiSideNavItemType<{}>> => {
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  const getSideNav = useCallback(
    (tab: NavTab) => {
      const { id, name, disabled } = tab;
      const isSelected = selectedTabId === id;
      const urlSearch = getSearch(tab, props);

      const handleClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        navigateToApp(APP_ID, { deepLinkId: id, path: urlSearch });
        track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
      };

      const appHref = getUrlForApp(APP_ID, { deepLinkId: id, path: urlSearch });
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
    },
    [getUrlForApp, navigateToApp, selectedTabId, props]
  );

  return [
    {
      id: APP_ID,
      name: '',
      items: [
        getSideNav(navTabs.overview),
        // TODO: [1101] Move the following nav items to its group
        getSideNav(navTabs.detections),
        getSideNav(navTabs.hosts),
        getSideNav(navTabs.network),
        getSideNav(navTabs.timelines),
        getSideNav(navTabs.case),
        getSideNav(navTabs.administration),
      ],
    },
    {
      ...navTabGroups.detect,
      items: [
        //     getSideNav(navTabs.alert),
        //     getSideNav(navTabs.rule),
        //     getSideNav(navTabs.exception),
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
