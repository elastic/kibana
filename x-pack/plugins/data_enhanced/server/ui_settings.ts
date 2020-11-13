/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from 'kibana/server';
import { UI_SETTINGS } from '../../../../src/plugins/data/server';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [UI_SETTINGS.SEARCH_TIMEOUT]: {
      name: i18n.translate('xpack.data.advancedSettings.searchTimeout', {
        defaultMessage: 'Search Timeout',
      }),
      value: 600000,
      description: i18n.translate('xpack.data.advancedSettings.searchTimeoutDesc', {
        defaultMessage:
          'Change the maximum timeout for a search session or set to 0 to disable the timeout and allow queries to run to completion.',
      }),
      type: 'number',
      category: ['search'],
      schema: schema.number(),
    },
  };
}
