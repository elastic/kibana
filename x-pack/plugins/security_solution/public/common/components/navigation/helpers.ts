/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchNavTab, UrlStateType } from './types';
import { useUiSetting$ } from '../../lib/kibana';
import { ENABLE_GROUPED_NAVIGATION } from '../../../../common/constants';

export const getSearch = (tab: SearchNavTab, globalQueryString: string): string => {
  if (tab && tab.urlKey != null && !isAdministration(tab.urlKey)) {
    return globalQueryString.length > 0 ? `?${globalQueryString}` : '';
  }

  return '';
};

export const isAdministration = (urlKey: UrlStateType): boolean => 'administration' === urlKey;

/**
 * Hook to check if the new grouped navigation is enabled on both experimental flag and advanced settings
 * TODO: remove this function when flag and setting not needed
 */
export const useIsGroupedNavigationEnabled = () => {
  const [groupedNavSettingEnabled] = useUiSetting$<boolean>(ENABLE_GROUPED_NAVIGATION);
  return groupedNavSettingEnabled;
};
