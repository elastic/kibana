/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';

import { enterpriseSearchFeatureId, enableIndexPipelinesTab } from '../common/ui_settings_keys';

/**
 * uiSettings definitions for Enterprise Search
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [enableIndexPipelinesTab]: {
    category: [enterpriseSearchFeatureId],
    description: i18n.translate('xpack.enterpriseSearch.uiSettings.indexPipelines.description', {
      defaultMessage: 'Enable the new index pipelines tab in Enterprise Search.',
    }),
    name: i18n.translate('xpack.enterpriseSearch.uiSettings.indexPipelines.name', {
      defaultMessage: 'Enable index pipelines',
    }),
    requiresPageReload: false,
    schema: schema.boolean(),
    value: false,
  },
};
