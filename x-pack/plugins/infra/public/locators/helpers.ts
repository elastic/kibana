/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight } from 'lodash';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { LogsLocatorParams } from './logs_locator';
import {
  DEFAULT_LOG_VIEW_ID,
  replaceLogViewInQueryString,
} from '../observability_logs/log_view_state';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';
import type { InfraClientCoreSetup, QueryTimeRange } from '../types';

interface LocationToDiscoverParams {
  core: InfraClientCoreSetup;
  timeRange?: QueryTimeRange;
  filter?: string;
}

export const parseSearchString = ({
  time,
  timeRange,
  filter = '',
  logViewId = DEFAULT_LOG_VIEW_ID,
}: LogsLocatorParams) => {
  return flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }, time, timeRange),
    replaceLogPositionInQueryString(time),
    replaceLogViewInQueryString({ type: 'log-view-reference', logViewId })
  )('');
};

export const getLocationToDiscover = async ({
  core,
  timeRange,
  filter,
}: LocationToDiscoverParams) => {
  const [, plugins] = await core.getStartServices();

  const discoverParams: DiscoverAppLocatorParams = {
    ...(timeRange ? { from: timeRange.from, to: timeRange.to } : {}),
    ...(filter
      ? {
          query: {
            language: 'kuery',
            query: filter,
          },
        }
      : {}),
  };

  const discoverLocation = await plugins.discover.locator?.getLocation(discoverParams);

  if (!discoverLocation) {
    throw new Error('Discover location not found');
  }

  return discoverLocation;
};
