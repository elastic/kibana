/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(($injector) => {

  const licenseService = $injector.get('logstashLicenseService');
  if (!licenseService.enableLinks) {
    return;
  }

  return {
    id: 'management_logstash',
    title: 'Logstash Pipelines',
    description: 'Create, delete, update, and clone data ingestion pipelines.',
    icon: 'pipelineApp',
    path: '/app/kibana#/management/logstash/pipelines',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
