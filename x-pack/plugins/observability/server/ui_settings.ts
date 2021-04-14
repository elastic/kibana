/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../../src/core/types';
import { enableAlertingExperience, enableInspectEsQueries } from '../common/ui_settings_keys';

/**
 * uiSettings definitions for Observability.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [enableAlertingExperience]: {
    category: ['observability'],
    name: i18n.translate('xpack.observability.enableAlertingExperienceExperimentName', {
      defaultMessage: 'Observability alerting experience',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability.enableAlertingExperienceExperimentDescription',
      {
        defaultMessage:
          'Enable the experimental alerting experience for Observability. Adds the Alerts and Cases pages.',
      }
    ),
    schema: schema.boolean(),
  },
  [enableInspectEsQueries]: {
    category: ['observability'],
    name: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentName', {
      defaultMessage: 'inspect ES queries',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentDescription', {
      defaultMessage: 'Inspect Elasticsearch queries in API responses.',
    }),
    schema: schema.boolean(),
  },
};
