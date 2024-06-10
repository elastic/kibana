/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES, type Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';

interface FeatureRegistrationOpts {
  features: FeaturesPluginSetup;
  deprecatedRoles: string[] | false;
  isServerless: boolean;
  logger: Logger;
}

/**
 * If xpack.reporting.roles.enabled === true, register Reporting as a feature
 * that is controlled by user role names. Also, for Serverless register a
 * 'shell' Reporting Kibana feature.
 */
export function registerFeatures({
  isServerless,
  features,
  deprecatedRoles,
  logger,
}: FeatureRegistrationOpts) {
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
      app: [],
      privileges: {
        all: { savedObject: { all: [], read: [] }, ui: [] },
        // No read-only mode currently supported
        read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
      },
    });
  }

  if (deprecatedRoles !== false) {
    // refer to roles.allow configuration (deprecated path)
    const allowedRoles = ['superuser', ...(deprecatedRoles ?? [])];
    const privileges = allowedRoles.map((role) => ({
      requiredClusterPrivileges: [],
      requiredRoles: [role],
      ui: [],
    }));

    // self-register as an elasticsearch feature (deprecated)
    features.registerElasticsearchFeature({
      id: 'reporting',
      catalogue: ['reporting'],
      management: {
        insightsAndAlerting: ['reporting'],
      },
      privileges,
    });
  } else {
    logger.debug(
      `Reporting roles configuration is disabled. Please assign access to Reporting use Kibana feature controls for applications.`
    );
    // trigger application to register Reporting as a subfeature
    features.enableReportingUiCapabilities();
  }
}
