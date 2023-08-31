/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import type { AppFeatureKey } from '../../../common';
import type {
  AppFeatureSecurityKey,
  AppFeatureCasesKey,
  AppFeatureAssistantKey,
} from '../../../common/types/app_features';
import type { RecursivePartial } from '../../../common/utility_types';

export type BaseKibanaFeatureConfig = Omit<KibanaFeatureConfig, 'subFeatures'>;
export type SubFeaturesPrivileges = RecursivePartial<SubFeaturePrivilegeConfig>;
export type AppFeatureKibanaConfig<T extends string = string> =
  RecursivePartial<BaseKibanaFeatureConfig> & {
    subFeatureIds?: T[];
    subFeaturesPrivileges?: SubFeaturesPrivileges[];
  };
export type AppFeaturesConfig<T extends string = string> = Record<
  AppFeatureKey,
  AppFeatureKibanaConfig<T>
>;
export type AppFeaturesSecurityConfig<T extends string = string> = Record<
  AppFeatureSecurityKey,
  AppFeatureKibanaConfig<T>
>;
export type AppFeaturesCasesConfig<T extends string = string> = Record<
  AppFeatureCasesKey,
  AppFeatureKibanaConfig<T>
>;
export type AppFeaturesAssistantConfig<T extends string = string> = Record<
  AppFeatureAssistantKey,
  AppFeatureKibanaConfig<T>
>;
