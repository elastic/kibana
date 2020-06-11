/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useBasePath } from '../../lib/kibana';
import { SecurityPageName } from '../../../app/types';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';
import {
  APP_ALERTS_PATH,
  APP_CASES_PATH,
  APP_HOSTS_PATH,
  APP_MANAGEMENT_PATH,
  APP_NETWORK_PATH,
  APP_OVERVIEW_PATH,
  APP_TIMELINES_PATH,
} from '../../../../common/constants';

export { getDetectionEngineUrl } from './redirect_to_detection_engine';
export { getAppOverviewUrl } from './redirect_to_overview';
export { getHostDetailsUrl, getHostsUrl } from './redirect_to_hosts';
export { getNetworkUrl, getIPDetailsUrl } from './redirect_to_network';
export { getTimelinesUrl, getTimelineTabsUrl } from './redirect_to_timelines';
export {
  getCaseDetailsUrl,
  getCaseUrl,
  getCreateCaseUrl,
  getConfigureCasesUrl,
} from './redirect_to_case';

const getSubAppPath = (page: string) => {
  switch (page) {
    case SecurityPageName.alerts: {
      return APP_ALERTS_PATH;
    }
    case SecurityPageName.case: {
      return APP_CASES_PATH;
    }
    case SecurityPageName.hosts: {
      return APP_HOSTS_PATH;
    }
    case SecurityPageName.management: {
      return APP_MANAGEMENT_PATH;
    }
    case SecurityPageName.network: {
      return APP_NETWORK_PATH;
    }
    case SecurityPageName.overview: {
      return APP_OVERVIEW_PATH;
    }
    case SecurityPageName.timelines: {
      return APP_TIMELINES_PATH;
    }
    default:
      return APP_OVERVIEW_PATH;
  }
};

export const useFormatUrl = (page: SecurityPageName) => {
  const basePath = useBasePath();
  const search = useGetUrlSearch(navTabs[page]);
  const formatUrl = useCallback(
    (path: string) => {
      const hasSearch = path.includes('?');
      return `${basePath}${getSubAppPath(page)}${path}${!hasSearch ? search : ''}`;
    },
    [basePath, page, search]
  );
  return { formatUrl, search };
};
