/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ExperimentalFeatures } from '../../../common';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../plugin_contract';
import { DEFAULT_APP_FEATURES } from './constants';
import { registerKibanaFeatures } from './register_kibana_features';
import type { AppFeaturesMap, AppFeatureKey, AppFeatureKeys } from './types';

export class AppFeatures {
  private experimentalFeatures: ExperimentalFeatures;
  private appFeatures: AppFeaturesMap;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(experimentalFeatures: ExperimentalFeatures) {
    this.experimentalFeatures = experimentalFeatures;
    this.appFeatures = this.getAppFeaturesMapFromObject(DEFAULT_APP_FEATURES);
  }

  public setup(
    { http }: SecuritySolutionPluginCoreSetupDependencies,
    { features: featuresSetup }: SecuritySolutionPluginSetupDependencies
  ) {
    this.featuresSetup = featuresSetup;
    registerKibanaFeatures(featuresSetup, this.appFeatures, this.experimentalFeatures);
  }

  public set(appFeatureKeys: AppFeatureKeys) {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot set app features as featuresSetup is not present. Did you call setup?'
      );
    }
    this.appFeatures = this.getAppFeaturesMapFromObject(appFeatureKeys);
    registerKibanaFeatures(this.featuresSetup, this.appFeatures, this.experimentalFeatures);
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    return this.appFeatures.get(appFeatureKey) ?? false;
  }

  private getAppFeaturesMapFromObject(appFeatureKeys: AppFeatureKeys): AppFeaturesMap {
    return new Map(Object.entries(appFeatureKeys) as Array<[AppFeatureKey, boolean]>);
  }
}
