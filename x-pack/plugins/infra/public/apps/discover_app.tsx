/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { interpret } from 'xstate';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { InfraClientStartDeps, InfraClientStartExports } from '../types';
import type { LogViewColumnConfiguration, ResolvedLogView } from '../../common/log_views';
import { createLogViewStateMachine, DEFAULT_LOG_VIEW } from '../observability_logs/log_view_state';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../common/constants';

export const renderApp = (plugins: InfraClientStartDeps, pluginStart: InfraClientStartExports) => {
  const { discover } = plugins;
  const { logViews } = pluginStart;

  const machine = createLogViewStateMachine({
    initialContext: { logViewReference: DEFAULT_LOG_VIEW },
    logViews: logViews.client,
  });

  interpret(machine)
    .onTransition((state) => {
      if (
        state.matches('checkingStatus') ||
        state.matches('resolvedPersistedLogView') ||
        state.matches('resolvedInlineLogView')
      ) {
        return redirectToDiscover(discover, state.context.resolvedLogView);
      } else if (
        state.matches('loadingFailed') ||
        state.matches('resolutionFailed') ||
        state.matches('checkingStatusFailed')
      ) {
        return redirectToDiscover(discover);
      }
    })
    .start();

  return () => {};
};

const redirectToDiscover = (discover: DiscoverStart, resolvedLogView?: ResolvedLogView) => {
  if (!resolvedLogView) {
    return discover.locator?.navigate({});
  }

  const columns = parseColumns(resolvedLogView.columns);
  const {
    allowNoIndex,
    id,
    name,
    namespaces,
    sourceFilters,
    timeFieldName,
    type,
    typeMeta,
    version,
  } = resolvedLogView.dataViewReference;

  return discover.locator?.navigate({
    columns,
    dataViewId: id,
    dataViewSpec: {
      allowNoIndex,
      id,
      name,
      namespaces,
      sourceFilters,
      timeFieldName,
      type,
      typeMeta,
      version,
    },
  });
};

/**
 * Helpers
 */

const parseColumns = (columns: ResolvedLogView['columns']) => {
  return columns.map(getColumnValue).filter(Boolean) as string[];
};

const getColumnValue = (column: LogViewColumnConfiguration) => {
  if ('messageColumn' in column) return MESSAGE_FIELD;
  if ('timestampColumn' in column) return TIMESTAMP_FIELD;
  if ('fieldColumn' in column) return column.fieldColumn.field;

  return null;
};
