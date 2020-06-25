/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { SecurityPageName } from '../../../app/types';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';

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

export const useFormatUrl = (page: SecurityPageName) => {
  const history = useHistory();
  const search = useGetUrlSearch(navTabs[page]);
  const formatUrl = useCallback(
    (path: string) => {
      const pathArr = path.split('?');
      return history.createHref({
        pathname: pathArr[0],
        search: isEmpty(pathArr[1])
          ? search
          : `${pathArr[1]}${isEmpty(search) ? '' : `&${search}`}`,
      });
    },
    [history, search]
  );
  return { formatUrl, search };
};
