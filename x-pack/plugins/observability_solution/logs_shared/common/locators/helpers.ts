/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { DurationInputObject } from 'moment';
import { LogsLocatorParams, NodeLogsLocatorParams, TraceLogsLocatorParams } from './types';

export const getLogsQuery = (params: LogsLocatorParams) => {
  const { filter } = params;

  return filter ? { language: 'kuery', query: filter } : undefined;
};

export const createNodeLogsQuery = (params: NodeLogsLocatorParams) => {
  const { nodeField, nodeId, filter } = params;

  const nodeFilter = `${nodeField}: ${nodeId}`;
  return filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;
};

export const getNodeQuery = (params: NodeLogsLocatorParams) => {
  return { language: 'kuery', query: createNodeLogsQuery(params) };
};

export const getTraceQuery = (params: TraceLogsLocatorParams) => {
  const { traceId, filter } = params;

  const traceFilter = `trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}")`;
  const query = filter ? `(${traceFilter}) and (${filter})` : traceFilter;

  return { language: 'kuery', query };
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

export const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

export const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
