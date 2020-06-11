/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { IndexThresholdId } from '../../alerting_builtins/server';
import { AlertsFeatureId } from '../common';

export function registerFeature(features: FeaturesPluginSetup) {
  features.registerFeature({
    id: AlertsFeatureId,
    name: 'Alerts',
    app: [],
    privileges: {
      all: {
        alerting: {
          all: [IndexThresholdId],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        alerting: {
          read: [IndexThresholdId],
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
