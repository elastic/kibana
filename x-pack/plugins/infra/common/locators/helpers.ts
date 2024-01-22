/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import {
  DEFAULT_LOG_VIEW,
  LogViewColumnConfiguration,
  LogViewReference,
  ResolvedLogView,
  LogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import { flowRight } from 'lodash';
import type { InfraClientCoreSetup } from '../../public/types';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../constants';
import type { TimeRange } from '../time';
import {
  replaceLogFilterInQueryString,
  replaceLogPositionInQueryString,
  replaceLogViewInQueryString,
} from '../url_state_storage_service';

interface LocationToDiscoverParams {
  core: InfraClientCoreSetup;
  timeRange?: TimeRange;
  filter?: string;
  logView?: LogViewReference;
}

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
  const [, plugins] = await core.getStartServices();
  const { discover, logsShared } = plugins;
  const { logViews } = logsShared;
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
