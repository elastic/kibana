/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.editMonitorLoadingLabel',
  {
    defaultMessage: 'Loading monitor',
  }
);

export const ERROR_HEADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.editMonitorError',
  {
    defaultMessage: 'Error loading Monitor Management',
  }
);

export const SERVICE_LOCATIONS_ERROR_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.addMonitorError',
  {
    defaultMessage: 'Service locations were not able to be loaded. Please try again later.',
  }
);

export const MONITOR_LOADING_ERROR_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.editMonitorErrorBody',
  {
    defaultMessage: 'Monitor configuration was not able to be loaded. Please try again later.',
  }
);
