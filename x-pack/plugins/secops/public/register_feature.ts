/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';

const APP_ID = 'secops';

FeatureCatalogueRegistryProvider.register(() => ({
  id: 'secops',
  title: 'Sec Ops',
  description: 'Explore security metrics and logs for events and alerts',
  icon: 'securityApp',
  path: `/app/${APP_ID}#home`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));
