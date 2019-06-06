/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';
import { PLUGIN_ID } from '../common/constants';
import { APP_ROOT } from './routes';

// This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
FeatureCatalogueRegistryProvider.register(() => ({
  id: PLUGIN_ID,
  title: 'Integrations Manager',
  description: 'Install and manage your elastic data ingest integrations',
  icon: 'merge',
  path: APP_ROOT,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));
