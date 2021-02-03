/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../../src/core/types';
import {
  enableCorrelations,
  enableServiceOverview,
} from '../common/ui_settings_keys';

/**
 * uiSettings definitions for APM.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [enableCorrelations]: {
    category: ['observability'],
    name: i18n.translate('xpack.apm.enableCorrelationsExperimentName', {
      defaultMessage: 'APM correlations (Platinum required)',
    }),
    value: false,
    description: i18n.translate(
      'xpack.apm.enableCorrelationsExperimentDescription',
      {
        defaultMessage: 'Enable the experimental correlations feature in APM',
      }
    ),
    schema: schema.boolean(),
  },
  [enableServiceOverview]: {
    category: ['observability'],
    name: i18n.translate('xpack.apm.enableServiceOverviewExperimentName', {
      defaultMessage: 'APM Service overview',
    }),
    value: true,
    description: i18n.translate(
      'xpack.apm.enableServiceOverviewExperimentDescription',
      {
        defaultMessage: 'Enable the Overview tab for services in APM.',
      }
    ),
    schema: schema.boolean(),
  },
};
