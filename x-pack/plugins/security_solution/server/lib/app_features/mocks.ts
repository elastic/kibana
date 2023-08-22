/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { DEFAULT_APP_FEATURES } from '@kbn/security-solution-ess/server/constants';
import { AppFeaturesService } from '../app_features_service/app_features_service';
import { allowedExperimentalValues, type ExperimentalFeatures } from '../../../common';

class AppFeaturesMock extends AppFeaturesService {
  protected registerEnabledKibanaFeatures() {
    // NOOP
  }
}

export const createAppFeaturesMock = (
  /** List of features keys that should be enabled. Default is all */
  enabledFeatureKeys = DEFAULT_APP_FEATURES,
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('appFeatureMock')
): AppFeaturesService => {
  const appFeatures = new AppFeaturesMock(logger, experimentalFeatures);

  appFeatures.init(featuresPluginSetupContract);

  // TODO: fix this without importing getProductAppFeaturesConfigurator
  // if (enabledFeatureKeys) {
  //   const appFeaturesConfigurator = getProductAppFeaturesConfigurator(enabledFeatureKeys);
  //   appFeatures.setAppFeaturesConfigurator(DEFAULT_APP_FEATURES);
  // }

  return appFeatures;
};
