/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight } from 'lodash';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { findInventoryFields } from '../inventory_models';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../constants';
import type { TimeRange } from '../time';
import type { LogsLocatorParams } from './logs_locator';
import type { InfraClientCoreSetup } from '../../public/types';
import {
  DEFAULT_LOG_VIEW,
  LogViewColumnConfiguration,
  LogViewReference,
  replaceLogFilterInQueryString,
  replaceLogPositionInQueryString,
  replaceLogViewInQueryString,
  ResolvedLogView,
} from '../log_views';
import type { NodeLogsLocatorParams } from './node_logs_locator';

interface LocationToDiscoverParams {
  core: InfraClientCoreSetup;
  timeRange?: TimeRange;
  filter?: string;
  logView?: LogViewReference;
}

export const createNodeLogsQuery = (params: NodeLogsLocatorParams) => {
  const { nodeType, nodeId, filter } = params;

  const nodeFilter = `${findInventoryFields(nodeType).id}: ${nodeId}`;
  const query = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;

  return query;
};

export const createSearchString = ({
  time,
  timeRange,
  filter = '',
  logView = DEFAULT_LOG_VIEW,
}: LogsLocatorParams) => {
  return flowRight(
    replaceLogFilterInQueryString({ language: 'kuery', query: filter }, time, timeRange),
    replaceLogPositionInQueryString(time),
    replaceLogViewInQueryString(logView)
  )('');
};

export const getLocationToDiscover = async ({
  core,
  timeRange,
  filter,
  logView = DEFAULT_LOG_VIEW,
}: LocationToDiscoverParams) => {
  const [, plugins, pluginStart] = await core.getStartServices();
  const { discover } = plugins;
  const { logViews } = pluginStart;
  const resolvedLogView = await logViews.client.getResolvedLogView(logView);

  const discoverParams: DiscoverAppLocatorParams = {
    ...(timeRange ? { from: timeRange.startTime, to: timeRange.endTime } : {}),
    ...(filter
      ? {
          query: {
            language: 'kuery',
            query: filter,
          },
        }
      : {}),
  };

  const discoverLocation = await constructDiscoverLocation(
    discover,
    discoverParams,
    resolvedLogView
  );

  if (!discoverLocation) {
    throw new Error('Discover location not found');
  }

  return discoverLocation;
};

const constructDiscoverLocation = async (
  discover: DiscoverStart,
  discoverParams: DiscoverAppLocatorParams,
  resolvedLogView?: ResolvedLogView
) => {
  if (!resolvedLogView) {
    return await discover.locator?.getLocation(discoverParams);
  }

  const columns = parseColumns(resolvedLogView.columns);
  const dataViewSpec = resolvedLogView.dataViewReference.toSpec();

  return await discover.locator?.getLocation({
    ...discoverParams,
    columns,
    dataViewId: dataViewSpec.id,
    dataViewSpec,
  });
};

const parseColumns = (columns: ResolvedLogView['columns']) => {
  return columns.map(getColumnValue).filter(Boolean) as string[];
};

const getColumnValue = (column: LogViewColumnConfiguration) => {
  if ('messageColumn' in column) return MESSAGE_FIELD;
  if ('timestampColumn' in column) return TIMESTAMP_FIELD;
  if ('fieldColumn' in column) return column.fieldColumn.field;

  return null;
};
