/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => ({
  id: 'uptime_monitoring',
  title: 'Uptime Monitoring',
  description: 'Perform endpoint health checks and uptime monitoring.',
  icon: 'heartbeatApp',
  path: `uptime#/home`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));
