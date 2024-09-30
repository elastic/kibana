/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface LogsRoute {
  id: string;
  title: string;
  path: string;
}

export interface LogsAppRoutes {
  logsAnomalies: LogsRoute;
  logsCategories: LogsRoute;
  settings: LogsRoute;
  stream?: LogsRoute;
}

export const getLogsAppRoutes = ({ isLogsStreamEnabled }: { isLogsStreamEnabled: boolean }) => {
  const routes: LogsAppRoutes = {
    logsAnomalies: {
      id: 'logs-anomalies',
      title: i18n.translate('xpack.infra.logs.index.anomaliesTabTitle', {
        defaultMessage: 'Logs Anomalies',
      }),
      path: '/anomalies',
    },
    logsCategories: {
      id: 'logs-categories',
      title: i18n.translate('xpack.infra.logs.index.logCategoriesBetaBadgeTitle', {
        defaultMessage: 'Logs Categories',
      }),
      path: '/log-categories',
    },
    settings: {
      id: 'settings',
      title: i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
        defaultMessage: 'Settings',
      }),
      path: '/settings',
    },
  };

  if (isLogsStreamEnabled) {
    routes.stream = {
      id: 'stream',
      title: i18n.translate('xpack.infra.logs.index.streamTabTitle', {
        defaultMessage: 'Stream',
      }),
      path: '/stream',
    };
  }

  return routes;
};
