/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { DEFAULT_LOG_SOURCES } from './constants';

/**
 * uiSettings definitions for the logs_data_access plugin.
 */
export const uiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.logsDataAccess.logSources', {
      defaultMessage: 'Log sources',
    }),
    value: DEFAULT_LOG_SOURCES,
    description: i18n.translate('xpack.logsDataAccess.logSourcesDescription', {
      defaultMessage:
        'Sources to be used for logs data. If the data contained in these indices is not logs data, you may experience degraded functionality. Changes to this setting can potentially impact the sources queried in Log Threshold rules.',
    }),
    type: 'array',
    schema: schema.arrayOf(schema.string()),
    requiresPageReload: true,
  },
};
