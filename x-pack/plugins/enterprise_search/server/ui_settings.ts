/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';

import {
  enterpriseSearchFeatureId,
  enableBehavioralAnalyticsSection,
} from '../common/ui_settings_keys';

/**
 * uiSettings definitions for Enterprise Search
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [enableBehavioralAnalyticsSection]: {
    category: [enterpriseSearchFeatureId],
    description: i18n.translate('xpack.enterpriseSearch.uiSettings.analytics.description', {
      defaultMessage: 'Enable the new Analytics section in Enterprise Search.',
    }),
    name: i18n.translate('xpack.enterpriseSearch.uiSettings.analytics.name', {
      defaultMessage: 'Enable Behavioral Analytics',
    }),
    requiresPageReload: true,
    schema: schema.boolean(),
    value: false,
  },
};
