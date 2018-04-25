/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory
} from 'ui/registry/feature_catalogue';

if (chrome.getInjected('apmUiEnabled')) {
  FeatureCatalogueRegistryProvider.register(() => {
    return {
      id: 'apm',
      title: 'APM',
      description:
        'Automatically collect in-depth performance metrics and ' +
        'errors from inside your applications.',
      icon: '/plugins/kibana/assets/app_apm.svg',
      path: '/app/apm',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA
    };
  });
}
