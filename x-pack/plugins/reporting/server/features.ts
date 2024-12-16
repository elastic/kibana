/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

interface FeatureRegistrationOpts {
  features: FeaturesPluginSetup;
  isServerless: boolean;
}

export function registerFeatures({ isServerless, features }: FeatureRegistrationOpts) {
  // Register a 'shell' feature specifically for Serverless. If granted, it will automatically provide access to
  // reporting capabilities in other features, such as Discover, Dashboards, and Visualizations. On its own, this
  // feature doesn't grant any additional privileges.
  if (isServerless) {
    features.registerKibanaFeature({
      id: 'reporting',
      name: i18n.translate('xpack.reporting.features.reportingFeatureName', {
        defaultMessage: 'Reporting',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [],
      privileges: {
        all: { savedObject: { all: [], read: [] }, ui: [] },
        // No read-only mode currently supported
        read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
      },
    });
  }

  features.enableReportingUiCapabilities();
}
