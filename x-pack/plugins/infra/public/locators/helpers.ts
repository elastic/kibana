/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight } from 'lodash';
import moment from 'moment';
import type { LogsLocatorParams } from './logs_locator';
import type { NodeLogsLocatorParams } from './node_logs_locator';
import { findInventoryFields } from '../../common/inventory_models';
import {
  DEFAULT_LOG_VIEW_ID,
  replaceLogViewInQueryString,
} from '../observability_logs/log_view_state';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';

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

export const constructUrlSearchString = (params: Partial<NodeLogsLocatorParams>) => {
  const { time = 1550671089404, logViewId } = params;

  return `/stream?logView=${constructLogView(logViewId)}&logPosition=${constructLogPosition(
    time
  )}&logFilter=${constructLogFilter(params)}`;
};

const constructLogView = (logViewId: string = DEFAULT_LOG_VIEW_ID) => {
  return `(logViewId:${logViewId},type:log-view-reference)`;
};

const constructLogPosition = (time: number = 1550671089404) => {
  return `(position:(tiebreaker:0,time:${time}))`;
};

const constructLogFilter = ({
  nodeType,
  nodeId,
  filter,
  timeRange,
  time,
}: Partial<NodeLogsLocatorParams>) => {
  let finalFilter = filter || '';

  if (nodeId) {
    const nodeFilter = `${findInventoryFields(nodeType!).id}: ${nodeId}`;
    finalFilter = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;
  }

  const query = encodeURI(
    `(query:(language:kuery,query:'${finalFilter}'),refreshInterval:(pause:!t,value:5000)`
  );

  if (!time) return `${query})`;

  const fromDate = timeRange?.from
    ? addHoursToTimestamp(timeRange.from, 0)
    : addHoursToTimestamp(time, -1);

  const toDate = timeRange?.to
    ? addHoursToTimestamp(timeRange.to, 0)
    : addHoursToTimestamp(time, 1);

  return `${query},timeRange:(from:'${fromDate}',to:'${toDate}'))`;
};

const addHoursToTimestamp = (timestamp: number, hours: number): string => {
  return moment(timestamp).add({ hours }).toISOString();
};
