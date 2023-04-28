/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interpret } from 'xstate';
import { waitFor } from 'xstate/lib/waitFor';
import { flowRight } from 'lodash';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../common/constants';
import {
  createLogViewStateMachine,
  DEFAULT_LOG_VIEW,
  DEFAULT_LOG_VIEW_ID,
  initializeFromUrl,
  replaceLogViewInQueryString,
} from '../observability_logs/log_view_state';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';
import type { LogsLocatorParams } from './logs_locator';
import type { InfraClientCoreSetup, QueryTimeRange } from '../types';
import type { LogViewColumnConfiguration, ResolvedLogView } from '../../common/log_views';

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
  const [coreStart, plugins, pluginStart] = await core.getStartServices();
  const { discover } = plugins;
  const { logViews } = pluginStart;

  const machine = createLogViewStateMachine({
    initialContext: { logViewReference: DEFAULT_LOG_VIEW },
    logViews: logViews.client,
    initializeFromUrl: createInitializeFromUrl(coreStart),
  });

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

  if ('resolvedLogView' in doneState.context) {
    discoverLocation = await constructDiscoverLocation(
      discover,
      discoverParams,
      doneState.context.resolvedLogView
    );
  } else {
    discoverLocation = await constructDiscoverLocation(discover, discoverParams);
  }

  service.stop();

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
  const locationParams = !resolvedLogView
    ? discoverParams
    : {
        ...discoverParams,
        columns: parseColumns(resolvedLogView.columns),
        dataViewId: resolvedLogView.dataViewReference.toSpec().id,
        dataViewSpec: resolvedLogView.dataViewReference.toSpec(),
      };

  return await discover.locator?.getLocation(locationParams);
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

const createInitializeFromUrl = (core: CoreStart) => {
  const toastsService = core.notifications.toasts;

  const urlStateStorage = createKbnUrlStateStorage({
    useHash: false,
    useHashQuery: false,
  });

  return initializeFromUrl({ toastsService, urlStateStorage });
};
