/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { interpret } from 'xstate';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { InfraClientStartDeps, InfraClientStartExports } from '../types';
import type { LogViewColumnConfiguration, ResolvedLogView } from '../../common/log_views';
import {
  createLogViewStateMachine,
  DEFAULT_LOG_VIEW,
  initializeFromUrl,
} from '../observability_logs/log_view_state';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../common/constants';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  params: AppMountParameters
) => {
  const { discover } = plugins;
  const { logViews } = pluginStart;

  const machine = createLogViewStateMachine({
    initialContext: { logViewReference: DEFAULT_LOG_VIEW },
    logViews: logViews.client,
    initializeFromUrl: createInitializeFromUrl(core, params),
  });

  const service = interpret(machine)
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

  return () => {
    // Stop machine interpreter after navigation
    service.stop();
  };
};

const redirectToDiscover = (discover: DiscoverStart, resolvedLogView?: ResolvedLogView) => {
  const navigationOptions = { replace: true };

  if (!resolvedLogView) {
    return discover.locator?.navigate({}, navigationOptions);
  }

  const columns = parseColumns(resolvedLogView.columns);
  const dataViewSpec = resolvedLogView.dataViewReference.toSpec();

  return discover.locator?.navigate(
    {
      columns,
      dataViewId: dataViewSpec.id,
      dataViewSpec,
    },
    navigationOptions
  );
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

const createInitializeFromUrl = (core: CoreStart, params: AppMountParameters) => {
  const toastsService = core.notifications.toasts;

  const urlStateStorage = createKbnUrlStateStorage({
    history: params.history,
    useHash: false,
    useHashQuery: false,
  });

  return initializeFromUrl({ toastsService, urlStateStorage });
};
