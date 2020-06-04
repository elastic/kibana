/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { IndexThresholdId } from '../../alerting_builtins/server';

export function registerFeature(features: FeaturesPluginSetup) {
  features.registerFeature({
    id: 'alerts',
    name: 'alerts',
    app: [],
    privileges: {
      all: {
        alerting: {
          globally: {
            all: [IndexThresholdId],
          },
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        alerting: {
          globally: {
            all: [IndexThresholdId],
          },
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
