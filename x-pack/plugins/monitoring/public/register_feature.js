/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import chrome from 'ui/chrome';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

if (chrome.getInjected('monitoringUiEnabled')) {
  FeatureCatalogueRegistryProvider.register((i18n) => {
    return {
      id: 'monitoring',
      title: i18n('xpack.monitoring.monitoringTitle', {
        defaultMessage: 'Monitoring'
      }),
      description: i18n('xpack.monitoring.monitoringDescription', {
        defaultMessage: 'Track the real-time health and performance of your Elastic Stack.'
      }),
      icon: 'monitoringApp',
      path: '/app/monitoring',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN
    };
  });
}
