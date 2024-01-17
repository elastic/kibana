/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '@kbn/discover-locators';
import {
  DEFAULT_LOG_VIEW,
  LogViewColumnConfiguration,
  LogViewReference,
  ResolvedLogView,
  LogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import { flowRight } from 'lodash';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { SharePluginStart } from '@kbn/share-plugin/public';
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
  const { share, logsShared } = plugins;
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

  const discoverLocation = await constructDiscoverLocation(share, discoverParams, resolvedLogView);

  if (!discoverLocation) {
    throw new Error('Discover location not found');
  }

  return discoverLocation;
};

const constructDiscoverLocation = async (
  share: SharePluginStart,
  discoverParams: DiscoverAppLocatorParams,
  resolvedLogView?: ResolvedLogView
) => {
  const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);

  if (!resolvedLogView) {
    return await locator?.getLocation(discoverParams);
  }

  const columns = parseColumns(resolvedLogView.columns);
  const dataViewSpec = resolvedLogView.dataViewReference.toSpec();

  return await locator?.getLocation({
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
