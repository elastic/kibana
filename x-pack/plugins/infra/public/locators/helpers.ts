/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interpret } from 'xstate';
import { waitFor } from 'xstate/lib/waitFor';
import { flowRight } from 'lodash';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { findInventoryFields } from '../../common/inventory_models';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../common/constants';
import {
  createLogViewStateMachine,
  DEFAULT_LOG_VIEW,
  replaceLogViewInQueryString,
} from '../observability_logs/log_view_state';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';
import type { TimeRange } from '../../common/time';
import type { LogsLocatorParams } from './logs_locator';
import type { InfraClientCoreSetup } from '../types';
import type {
  LogViewColumnConfiguration,
  LogViewReference,
  ResolvedLogView,
} from '../../common/log_views';
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
  logView,
}: LocationToDiscoverParams) => {
  const [, plugins, pluginStart] = await core.getStartServices();
  const { discover } = plugins;
  const { logViews } = pluginStart;

  const machine = createLogViewStateMachine({
    initialContext: { logViewReference: logView || DEFAULT_LOG_VIEW },
    logViews: logViews.client,
  });

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

  let discoverLocation;

  const service = interpret(machine).start();
  const doneState = await waitFor(
    service,
    (state) =>
      state.matches('checkingStatus') ||
      state.matches('resolvedPersistedLogView') ||
      state.matches('resolvedInlineLogView') ||
      state.matches('loadingFailed') ||
      state.matches('resolutionFailed') ||
      state.matches('checkingStatusFailed')
  );

  service.stop();

  if ('resolvedLogView' in doneState.context) {
    discoverLocation = await constructDiscoverLocation(
      discover,
      discoverParams,
      doneState.context.resolvedLogView
    );
  } else {
    discoverLocation = await constructDiscoverLocation(discover, discoverParams);
  }

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
