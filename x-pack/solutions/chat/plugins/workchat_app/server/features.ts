/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  WORKCHAT_FEATURE_ID,
  WORKCHAT_FEATURE_NAME,
  WORKCHAT_APP_ID,
  capabilityGroups,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: WORKCHAT_FEATURE_ID,
    name: WORKCHAT_FEATURE_NAME,
    minimumLicense: 'enterprise',
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.chat,
    app: ['kibana', WORKCHAT_APP_ID],
    catalogue: [WORKCHAT_FEATURE_ID],
    privileges: {
      all: {
        app: ['kibana', WORKCHAT_APP_ID],
        api: [...capabilityGroups.api.all],
        catalogue: [WORKCHAT_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.all],
        // composedOf: [{ feature: WORKCHAT_FRAMEWORK_FEATURE_ID, privileges: ['all'] }],
      },
      read: {
        app: ['kibana', WORKCHAT_APP_ID],
        api: [...capabilityGroups.api.read],
        catalogue: [WORKCHAT_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.read],
        // composedOf: [{ feature: WORKCHAT_FRAMEWORK_FEATURE_ID, privileges: ['read'] }],
      },
    },
  });
};
