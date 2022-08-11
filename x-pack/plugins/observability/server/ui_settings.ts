/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';
import { observabilityFeatureId } from '../common';
import {
  enableInspectEsQueries,
  enableNewSyntheticsView,
  maxSuggestions,
} from '../common/ui_settings_keys';
import { apmUISettings } from '../common/apm_ui_settings';

/**
 * uiSettings definitions for Observability.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean | number | string>> = {
  [enableNewSyntheticsView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableNewSyntheticsViewExperimentName', {
      defaultMessage: 'Enable new synthetic monitoring application',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability.enableNewSyntheticsViewExperimentDescription',
      {
        defaultMessage:
          'Enable new synthetic monitoring application in observability. Refresh the page to apply the setting.',
      }
    ),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [enableInspectEsQueries]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentName', {
      defaultMessage: 'Inspect ES queries',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentDescription', {
      defaultMessage: 'Inspect Elasticsearch queries in API responses.',
    }),
    schema: schema.boolean(),
  },
  [maxSuggestions]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.maxSuggestionsUiSettingName', {
      defaultMessage: 'Maximum suggestions',
    }),
    value: 100,
    description: i18n.translate('xpack.observability.maxSuggestionsUiSettingDescription', {
      defaultMessage: 'Maximum number of suggestions fetched in autocomplete selection boxes.',
    }),
    schema: schema.number(),
  },
  ...apmUISettings,
};
