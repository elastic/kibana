/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback } from 'react';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';
import { SiemNavTabKey } from '../navigation/types';

export { getDetectionEngineUrl, getRuleDetailsUrl } from './redirect_to_detection_engine';
export { getAppOverviewUrl } from './redirect_to_overview';
export { getHostDetailsUrl, getHostsUrl } from './redirect_to_hosts';
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

export const useFormatUrl = (page: SiemNavTabKey) => {
  const { getUrlForApp } = useKibana().services.application;
  const search = useGetUrlSearch(navTabs[page]);
  const formatUrl = useCallback<FormatUrl>(
    (path: string, { absolute = false, skipSearch = false } = {}) => {
      const pathArr = path.split('?');
      const formattedPath = `${pathArr[0]}${
        !skipSearch
          ? isEmpty(pathArr[1])
            ? search
            : `?${pathArr[1]}${isEmpty(search) ? '' : `&${search}`}`
          : isEmpty(pathArr[1])
          ? ''
          : `?${pathArr[1]}`
      }`;
      return getUrlForApp(APP_ID, { deepLinkId: page, path: formattedPath, absolute });
    },
    [getUrlForApp, page, search]
  );

  return { formatUrl, search };
};
