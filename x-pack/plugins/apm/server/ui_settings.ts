/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../../src/core/types';
import { observabilityFeatureId } from '../../observability/common';
import { enableServiceOverview } from '../common/ui_settings_keys';

/**
 * uiSettings definitions for APM.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [enableServiceOverview]: {
    category: [observabilityFeatureId],
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
