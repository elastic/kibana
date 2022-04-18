/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from '@kbn/core/public';
import { FeaturesPlugin, FeaturesPluginSetup, FeaturesPluginStart } from './plugin';

export type {
  KibanaFeatureConfig,
  FeatureKibanaPrivileges,
  SubFeatureConfig,
  SubFeaturePrivilegeConfig,
} from '../common';
export { KibanaFeature } from '../common';

export type { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';

export const plugin: PluginInitializer<FeaturesPluginSetup, FeaturesPluginStart> = () =>
  new FeaturesPlugin();
