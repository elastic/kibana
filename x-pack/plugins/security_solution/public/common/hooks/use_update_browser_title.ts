/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { navTabs } from '../../app/home/home_navigations';
import { useIsGroupedNavigationEnabled } from '../components/navigation/helpers';
import type { NavTab } from '../components/navigation/types';
import { getLinkInfo } from '../links';
import { useRouteSpy } from '../utils/route/use_route_spy';

export const useUpdateBrowserTitle = () => {
  const isGroupedNavEnabled = useIsGroupedNavigationEnabled();
  const [{ pageName }] = useRouteSpy();
  const linkInfo = getLinkInfo(pageName);

  useEffect(() => {
    if (!isGroupedNavEnabled) {
      document.title = `${getTitle(pageName, navTabs)} - Kibana`;
    } else {
      document.title = `${linkInfo?.title ?? ''} - Kibana`;
    }
  }, [pageName, isGroupedNavEnabled, linkInfo]);
};

export const getTitle = (pageName: string, tabs: Record<string, NavTab>): string => {
  return tabs[pageName] != null ? tabs[pageName].name : '';
};
