/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USAGE_DASHBOARD_LINK = (apiProvider: string, connectorName: string) =>
  i18n.translate('xpack.stackConnectors.components.genAi.dashboardLink', {
    values: { apiProvider, connectorName },
    defaultMessage: 'View {apiProvider} Usage Dashboard for "{ connectorName }" Connector',
  });

export const GET_DASHBOARD_API_ERROR = (apiProvider: string) =>
  i18n.translate('xpack.stackConnectors.components.genAi.error.dashboardApiError', {
    values: { apiProvider },
    defaultMessage: 'Error finding {apiProvider} Token Usage Dashboard.',
  });
