/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { INDEX_THRESHOLD_ID } from '../../alerting_builtins/server';
import { ALERTS_FEATURE_ID } from '../common';

export function registerFeature(features: FeaturesPluginSetup) {
  features.registerFeature({
    id: ALERTS_FEATURE_ID,
    name: i18n.translate('xpack.alerts.featureRegistry.alertsFeatureName', {
      defaultMessage: 'Alerts',
    }),
    app: [],
    privileges: {
      all: {
        alerting: {
          all: [INDEX_THRESHOLD_ID],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        alerting: {
          read: [INDEX_THRESHOLD_ID],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
}
