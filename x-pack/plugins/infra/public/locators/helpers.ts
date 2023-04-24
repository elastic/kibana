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
import { replaceLogViewInQueryString } from '../observability_logs/log_view_state';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';

export const parseSearchString = ({
  time,
  from,
  to,
  filter = '',
  logViewId = 'default',
}: LogsLocatorParams) => {
  return flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }, time, from, to),
    replaceLogPositionInQueryString(time),
    replaceLogViewInQueryString({ type: 'log-view-reference', logViewId })
  )('');
};

export const constructUrlSearchString = (params: Partial<NodeLogsLocatorParams>) => {
  const { time = 1550671089404, logViewId } = params;

  return `/stream?logView=${getLogView(logViewId)}&logPosition=${getLogPosition(
    time
  )}&logFilter=${getLogFilter(params)}`;
};

const getLogView = (logViewId: string = 'default') => {
  return `(logViewId:${logViewId},type:log-view-reference)`;
};

const getLogPosition = (time: number = 1550671089404) => {
  return `(position:(tiebreaker:0,time:${time}))`;
};

const getLogFilter = ({
  nodeType,
  nodeId,
  filter,
  from,
  to,
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

  const fromDate = from ? addHoursToTimestamp(from, 0) : addHoursToTimestamp(time, -1);
  const toDate = to ? addHoursToTimestamp(to, 0) : addHoursToTimestamp(time, 1);

  return `${query},timeRange:(from:'${fromDate}',to:'${toDate}'))`;
};

export const addHoursToTimestamp = (timestamp: number, hours: number): string => {
  return moment(timestamp).add({ hours }).toISOString();
};
