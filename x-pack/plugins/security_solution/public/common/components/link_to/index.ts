/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback } from 'react';
import { SecurityPageName } from '../../../app/types';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';
import { getTimelineUrl } from './redirect_to_timelines';

export { getDetectionEngineUrl } from './redirect_to_detection_engine';
export { getAppOverviewUrl } from './redirect_to_overview';
export { getHostDetailsUrl, getHostsUrl } from './redirect_to_hosts';
export { getNetworkUrl, getNetworkDetailsUrl } from './redirect_to_network';
export { getTimelinesUrl, getTimelineTabsUrl, getTimelineUrl } from './redirect_to_timelines';
export {
  getCaseDetailsUrl,
  getCaseUrl,
  getCreateCaseUrl,
  getConfigureCasesUrl,
  getCaseDetailsUrlWithCommentId,
} from './redirect_to_case';

export const useFormatUrl = (page: SecurityPageName) => {
  const { getUrlForApp } = useKibana().services.application;
  const search = useGetUrlSearch(navTabs[page]);
  const formatUrl = useCallback(
    (path: string, absolute: boolean = false) => {
      const pathArr = path.split('?');
      const formattedPath = `${pathArr[0]}${
        isEmpty(pathArr[1]) ? search : `${pathArr[1]}${isEmpty(search) ? '' : `&${search}`}`
      }`;
      return getUrlForApp(`${APP_ID}:${page}`, {
        path: formattedPath,
        absolute,
      });
    },
    [getUrlForApp, page, search]
  );
  return { formatUrl, search };
};

export const useTimelineUrl = () => {
  const { getUrlForApp } = useKibana().services.application;
  const baseUrl = getUrlForApp(`${APP_ID}:${SecurityPageName.timelines}`, {
    path: '',
    absolute: true,
  });

  const timelineUrl = useCallback(
    (id: string, graphEventId?: string) => `${baseUrl}${getTimelineUrl(id ?? '', graphEventId)}`,
    [baseUrl]
  );

  return { timelineUrl };
};
