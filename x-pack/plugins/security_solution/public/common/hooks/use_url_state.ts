/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncGlobalQueryString } from '../utils/global_query_string';
import { useInitSearchBarFromUrlParams } from './search_bar/use_init_search_bar_url_params';
import { useInitTimerangeFromUrlParam } from './search_bar/use_init_timerange_url_params';
import { useUpdateTimerangeOnPageChange } from './search_bar/use_update_timerange_on_page_change';
import { useInitTimelineFromUrlParam } from './timeline/use_init_timeline_url_param';
import { useSyncTimelineUrlParam } from './timeline/use_sync_timeline_url_param';
import { useQueryTimelineByIdOnUrlChange } from './timeline/use_query_timeline_by_id_on_url_change';
import { useInitFlyoutFromUrlParam } from './flyout/use_init_flyout_url_param';
import { useSyncFlyoutUrlParam } from './flyout/use_sync_flyout_url_param';

// NOTE: the expandable flyout package url state is handled here:
// x-pack/plugins/security_solution/public/flyout/url/use_sync_flyout_state_with_url.tsx

export const useUrlState = () => {
  useSyncGlobalQueryString();
  useInitSearchBarFromUrlParams();
  useInitTimerangeFromUrlParam();
  useUpdateTimerangeOnPageChange();
  useInitTimelineFromUrlParam();
  useSyncTimelineUrlParam();
  useQueryTimelineByIdOnUrlChange();
  useInitFlyoutFromUrlParam();
  useSyncFlyoutUrlParam();
};

export enum URL_PARAM_KEY {
  appQuery = 'query',
  eventFlyout = 'eventFlyout',
  filters = 'filters',
  savedQuery = 'savedQuery',
  sourcerer = 'sourcerer',
  timeline = 'timeline',
  timerange = 'timerange',
  pageFilter = 'pageFilters',
  rulesTable = 'rulesTable',
}
