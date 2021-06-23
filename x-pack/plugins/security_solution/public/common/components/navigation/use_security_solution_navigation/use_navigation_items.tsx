/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';
import { primaryNavigationItems } from '../../../../app/home/home_navigations';
import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana';
import { NavTab } from '../types';

export const usePrimaryNavigationItems = ({
  navTabs,
  selectedTabId,
  ...urlStateProps
}: PrimaryNavigationItemsProps): Array<EuiSideNavItemType<{}>> => {
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  const getSideNav = useCallback(
    (tab: NavTab) => {
      const { id, name, disabled } = tab;
      const isSelected = selectedTabId === id;
      const urlSearch = getSearch(tab, urlStateProps);

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
    [getUrlForApp, navigateToApp, selectedTabId, urlStateProps]
  );

  return useMemo(
    () =>
      primaryNavigationItems.map((item) => ({
        ...item,
        items: item.items.map((t: NavTab) => getSideNav(t)),
      })),
    [getSideNav]
  );
};
