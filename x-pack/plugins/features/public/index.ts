/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';
import { FeaturesPlugin } from './plugin';

export {
  FeatureKibanaPrivileges,
  KibanaFeature,
  KibanaFeatureConfig,
  SubFeatureConfig,
  SubFeaturePrivilegeConfig,
} from '../common';
export { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';

export const plugin: PluginInitializer<FeaturesPluginSetup, FeaturesPluginStart> = () =>
  new FeaturesPlugin();
