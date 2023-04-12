/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { interpret } from 'xstate';
import { TIMESTAMP_FIELD } from '../../common/constants';
import { LogView, LogViewFieldColumnConfiguration, ResolvedLogView } from '../../common/log_views';
import type { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { createLogViewStateMachine, DEFAULT_LOG_VIEW } from '../observability_logs/log_view_state';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports
) => {
  const { discover } = plugins;
  const { logViews } = pluginStart;

  const machine = createLogViewStateMachine({
    initialContext: { logViewReference: DEFAULT_LOG_VIEW },
    logViews: logViews.client,
  });

  interpret(machine)
    .onTransition((state) => {
      console.log(state);

      if (state.matches('resolvedPersistedLogView')) {
        const { resolvedLogView } = state.context;
        return redirectToDiscover(discover, resolvedLogView);
      }
    })
    .start();

  return () => {};
};

const redirectToDiscover = (discover: DiscoverStart, resolvedLogView: ResolvedLogView): void => {
  // const { logIndices, logColumns } = resolvedLogView.attributes;

  const columns = getColumns(resolvedLogView.columns);
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

  discover.locator?.navigate({
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

const getColumns = (logColumns: LogView['attributes']['logColumns']) => {
  return [TIMESTAMP_FIELD, getFieldColumnValue(logColumns), 'message'].filter(Boolean) as string[];
};

const getFieldColumnValue = (logColumns: LogView['attributes']['logColumns']) => {
  const column = logColumns.find((col) => 'fieldColumn' in col) as
    | LogViewFieldColumnConfiguration
    | undefined;

  return column?.fieldColumn.field;
};
