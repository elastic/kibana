/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { DEFAULT_ALLOWED_DATA_VIEWS } from './constants';

/**
 * uiSettings definitions for Logs Explorer.
 */
export const LOGS_EXPLORER_ALLOWED_LOGS_DATA_VIEWS_SETTING_KEY =
  'observability:logsExplorer:allowed_logs_data_views';

export const uiSettings: Record<string, UiSettingsParams> = {
  [LOGS_EXPLORER_ALLOWED_LOGS_DATA_VIEWS_SETTING_KEY]: {
    category: ['observability'],
    name: i18n.translate('xpack.logsExplorer.allowedLogsDataViews', {
      defaultMessage: 'Logs Explorer allowed data views',
    }),
    value: DEFAULT_ALLOWED_DATA_VIEWS,
    description: i18n.translate('xpack.logsExplorer.allowedLogsDataViewsDescription', {
      defaultMessage:
        'A list of base patterns to match logs data views and explore them in Logs Explorer. Remote clusters will be automatically matched for the passed base patterns.',
    }),
    schema: schema.arrayOf(schema.string()),
    requiresPageReload: true,
  },
};
