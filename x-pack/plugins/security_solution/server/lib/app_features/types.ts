/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import type { AppFeatureKey } from '../../../common';
import type { AppFeatureSecurityKey, AppFeatureCasesKey } from '../../../common/types/app_features';
import type { RecursivePartial } from '../../../common/utility_types';

export type SubFeaturesPrivileges = RecursivePartial<SubFeaturePrivilegeConfig>;
export type AppFeatureKibanaConfig = RecursivePartial<KibanaFeatureConfig> & {
  subFeaturesPrivileges?: SubFeaturesPrivileges[];
};
export type AppFeaturesConfig = Record<AppFeatureKey, AppFeatureKibanaConfig>;
export type AppFeaturesSecurityConfig = Record<AppFeatureSecurityKey, AppFeatureKibanaConfig>;
export type AppFeaturesCasesConfig = Record<AppFeatureCasesKey, AppFeatureKibanaConfig>;
