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
import { AppFeatures } from './app_features';
import type { AppFeatureKeys, ExperimentalFeatures } from '../../../common';
import { ALL_APP_FEATURE_KEYS, allowedExperimentalValues } from '../../../common';

class AppFeaturesMock extends AppFeatures {
  protected registerEnabledKibanaFeatures() {
    // NOOP
  }
}

export const createAppFeaturesMock = (
  /** What features keys should be enabled. Default is all */
  enabledFeatureKeys: AppFeatureKeys = [...ALL_APP_FEATURE_KEYS],
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('appFeatureMock')
) => {
  const appFeatures = new AppFeaturesMock(logger, experimentalFeatures);

  appFeatures.init(featuresPluginSetupContract);

  if (enabledFeatureKeys) {
    appFeatures.set(enabledFeatureKeys);
  }

  return appFeatures;
};
