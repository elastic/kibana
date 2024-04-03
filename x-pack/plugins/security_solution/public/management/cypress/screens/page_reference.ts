/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import {
  APP_BLOCKLIST_PATH,
  APP_ENDPOINTS_PATH,
  APP_EVENT_FILTERS_PATH,
  APP_HOST_ISOLATION_EXCEPTIONS_PATH,
  APP_POLICIES_PATH,
  APP_RESPONSE_ACTIONS_HISTORY_PATH,
  APP_TRUSTED_APPS_PATH,
} from '../../../../common/constants';

export interface EndpointManagementPageMap {
  endpointList: EndpointManagementPage;
  policyList: EndpointManagementPage;
  trustedApps: EndpointManagementPage;
  eventFilters: EndpointManagementPage;
  hostIsolationExceptions: EndpointManagementPage;
  blocklist: EndpointManagementPage;
  responseActionLog: EndpointManagementPage;
}

export type EndpointManagementPageId = keyof EndpointManagementPageMap;
export type EndpointArtifactPageId = keyof Pick<
  EndpointManagementPageMap,
  'trustedApps' | 'eventFilters' | 'hostIsolationExceptions' | 'blocklist'
>;

interface EndpointManagementPage {
  id: EndpointManagementPageId;
  title: string;
  url: string;
  pageTestSubj: string;
}

export const getEndpointManagementPageList = (): EndpointManagementPage[] => {
  return [
    {
      id: 'endpointList',
      title: 'Endpoint list page',
      url: APP_ENDPOINTS_PATH,
      pageTestSubj: 'endpointPage',
    },
    {
      id: 'policyList',
      title: 'Policy List page',
      url: APP_POLICIES_PATH,
      pageTestSubj: 'policyListPage',
    },
    {
      id: 'trustedApps',
      title: 'Trusted Apps Page',
      url: APP_TRUSTED_APPS_PATH,
      pageTestSubj: 'trustedAppsListPage-container',
    },
    {
      id: 'eventFilters',
      title: 'Event Filters page',
      url: APP_EVENT_FILTERS_PATH,
      pageTestSubj: 'EventFiltersListPage-container',
    },
    {
      id: 'hostIsolationExceptions',
      title: 'Host Isolation Exceptions page',
      url: APP_HOST_ISOLATION_EXCEPTIONS_PATH,
      pageTestSubj: 'hostIsolationExceptionsListPage-container',
    },
    {
      id: 'blocklist',
      title: 'Blocklist page',
      url: APP_BLOCKLIST_PATH,
      pageTestSubj: 'blocklistPage-container',
    },
    {
      id: 'responseActionLog',
      title: 'Response Actions History Log page',
      url: APP_RESPONSE_ACTIONS_HISTORY_PATH,
      pageTestSubj: 'responseActionsPage',
    },
  ];
};
export const getEndpointManagementPageMap = (): EndpointManagementPageMap => {
  return keyBy(getEndpointManagementPageList(), 'id') as unknown as EndpointManagementPageMap;
};
