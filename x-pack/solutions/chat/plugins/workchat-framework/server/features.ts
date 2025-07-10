/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  WORKCHAT_FRAMEWORK_FEATURE_ID,
  WORKCHAT_FRAMEWORK_FEATURE_NAME,
  WORKCHAT_FRAMEWORK_APP_ID,
  capabilityGroups,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: WORKCHAT_FRAMEWORK_FEATURE_ID,
    name: WORKCHAT_FRAMEWORK_FEATURE_NAME,
    minimumLicense: 'enterprise',
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.chat,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: ['kibana', WORKCHAT_FRAMEWORK_APP_ID],
    catalogue: [WORKCHAT_FRAMEWORK_FEATURE_ID],
    privileges: {
      all: {
        app: ['kibana', WORKCHAT_FRAMEWORK_APP_ID],
        api: [...capabilityGroups.api.all],
        catalogue: [WORKCHAT_FRAMEWORK_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.all],
      },
      read: {
        app: ['kibana', WORKCHAT_FRAMEWORK_APP_ID],
        api: [...capabilityGroups.api.read],
        catalogue: [WORKCHAT_FRAMEWORK_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.read],
      },
    },
  });
};
