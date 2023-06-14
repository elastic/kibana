/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { InfraClientStartExports } from '../types';
import { getLogViewReferenceFromUrl } from '../observability_logs/log_view_state';

export const renderApp = (
  core: CoreStart,
  pluginStart: InfraClientStartExports,
  params: AppMountParameters
) => {
  const toastsService = core.notifications.toasts;

  const urlStateStorage = createKbnUrlStateStorage({
    history: params.history,
    useHash: false,
    useHashQuery: false,
  });

  const logView = getLogViewReferenceFromUrl({ toastsService, urlStateStorage });

  pluginStart.locators.logsLocator.navigate({ ...(logView ? { logView } : {}) }, { replace: true });

  return () => true;
};
