/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { getSearch } from '../components/navigation/helpers';
import { useKibana, useNavigation } from '../lib/kibana';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../../common/constants';
import { NavTab } from './types';
import { useRouteSpy } from '../utils/route/use_route_spy';
import { makeMapStateToProps } from '../components/url_state/helpers';
import { useDeepEqualSelector } from '../hooks/use_selector';

export const useNavLinks = () => {
  const [routeProps] = useRouteSpy();
  const urlMapState = makeMapStateToProps();
  const { urlState } = useDeepEqualSelector(urlMapState);
  const {
    chrome,
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;

  const { detailName, flowTarget, pageName, pathName, search, state, tabName } = routeProps;
  const uiCapabilities = useKibana().services.application.capabilities;
  const { navigateTo, getAppUrl } = useNavigation();
  const getSideNav = useCallback(
    (tab: NavTab) => {
      const { id, name, disabled } = tab;
      const isSelected = selectedTabId === id;
      const urlSearch = getSearch(tab, urlStateProps);

      const handleClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        navigateTo({ deepLinkId: id, path: urlSearch });
      };

      const appHref = getAppUrl({ deepLinkId: id, path: urlSearch });

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
    [getAppUrl, navigateTo, selectedTabId, urlStateProps]
  );
  const navTabs = useMemo(() => (uiCapabilities.siem.show ? [] : []), [uiCapabilities.siem.show]);
  const primaryNavigationItems = useMemo(
    () =>
      navTabs.map((item) => ({
        ...item,
        items: item.items.map((t: NavTab) => getSideNav(t)),
      })),
    [getSideNav, navTabs]
  );

  return { navTabs };
};

export const FEATURE = {
  general: `${SERVER_APP_ID}.show`,
  casesRead: `${CASES_FEATURE_ID}.read_cases`,
  casesCrud: `${CASES_FEATURE_ID}.crud_cases`,
} as const;
