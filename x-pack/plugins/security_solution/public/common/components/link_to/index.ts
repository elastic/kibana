/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback } from 'react';
import { useGetUrlSearch, useGetUrlStateQueryString } from '../navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';
import { useAppUrl } from '../../lib/kibana/hooks';
import type { SecurityNavKey } from '../navigation/types';
import { SecurityPageName } from '../../../app/types';

export { getDetectionEngineUrl, getRuleDetailsUrl } from './redirect_to_detection_engine';
export { getHostDetailsUrl, getTabsOnHostDetailsUrl, getHostsUrl } from './redirect_to_hosts';
export { getKubernetesUrl, getKubernetesDetailsUrl } from './redirect_to_kubernetes';
export { getNetworkUrl, getNetworkDetailsUrl } from './redirect_to_network';
export { getTimelineTabsUrl, getTimelineUrl } from './redirect_to_timelines';
export {
  getCaseDetailsUrl,
  getCaseUrl,
  getCreateCaseUrl,
  getConfigureCasesUrl,
  getCaseDetailsUrlWithCommentId,
} from './redirect_to_case';

interface FormatUrlOptions {
  absolute: boolean;
  skipSearch: boolean;
}

export type FormatUrl = (path: string, options?: Partial<FormatUrlOptions>) => string;

export const useFormatUrl = (page: SecurityPageName) => {
  const { getAppUrl } = useAppUrl();
  const tab = page in navTabs ? navTabs[page as SecurityNavKey] : undefined;
  const search = useGetUrlSearch(tab);

  const formatUrl = useCallback<FormatUrl>(
    (path: string, { absolute = false, skipSearch = false } = {}) => {
      const formattedPath = formatPath(path, search, skipSearch);
      return getAppUrl({ deepLinkId: page, path: formattedPath, absolute });
    },
    [getAppUrl, page, search]
  );

  return { formatUrl, search };
};

export type GetSecuritySolutionUrl = (param: {
  deepLinkId: SecurityPageName;
  path?: string;
  absolute?: boolean;
  skipSearch?: boolean;
}) => string;

export const useGetSecuritySolutionUrl = () => {
  const { getAppUrl } = useAppUrl();
  const getUrlStateQueryString = useGetUrlStateQueryString();

  const getSecuritySolutionUrl = useCallback<GetSecuritySolutionUrl>(
    ({ deepLinkId, path = '', absolute = false, skipSearch = false }) => {
      const search = needsUrlState(deepLinkId) ? getUrlStateQueryString() : '';
      const formattedPath = formatPath(path, search, skipSearch);

      return getAppUrl({ deepLinkId, path: formattedPath, absolute });
    },
    [getAppUrl, getUrlStateQueryString]
  );

  return getSecuritySolutionUrl;
};

function formatPath(path: string, search: string, skipSearch?: boolean) {
  const [urlPath, parameterPath] = path.split('?');
  const formattedPath = `${urlPath}${
    !skipSearch
      ? isEmpty(parameterPath)
        ? search
        : `?${parameterPath}${isEmpty(search) ? '' : `&${search}`}`
      : isEmpty(parameterPath)
      ? ''
      : `?${parameterPath}`
  }`;
  return formattedPath;
}

// TODO: migrate to links.needsUrlState
function needsUrlState(pageId: SecurityPageName) {
  return (
    pageId !== SecurityPageName.dashboardsLanding &&
    pageId !== SecurityPageName.exploreLanding &&
    pageId !== SecurityPageName.administration &&
    pageId !== SecurityPageName.rules &&
    pageId !== SecurityPageName.exceptions &&
    pageId !== SecurityPageName.endpoints &&
    pageId !== SecurityPageName.policies &&
    pageId !== SecurityPageName.trustedApps &&
    pageId !== SecurityPageName.eventFilters &&
    pageId !== SecurityPageName.blocklist &&
    pageId !== SecurityPageName.hostIsolationExceptions
  );
}
