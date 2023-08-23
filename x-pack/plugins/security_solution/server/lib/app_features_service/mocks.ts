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

import {
  ALL_APP_FEATURE_KEYS,
  allowedExperimentalValues,
  type AppFeatureKeys,
  type ExperimentalFeatures,
} from '../../../common';
import { AppFeaturesService } from './app_features_service';

class AppFeaturesServiceMock extends AppFeaturesService {
  protected registerEnabledKibanaFeatures() {
    // NOOP
  }
}

export const createAppFeaturesServiceMock = (
  /** What features keys should be enabled. Default is all */
  enabledFeatureKeys: AppFeatureKeys = [...ALL_APP_FEATURE_KEYS],
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('appFeatureMock')
) => {
  const appFeaturesService = new AppFeaturesServiceMock(logger, experimentalFeatures);

  appFeaturesService.init(featuresPluginSetupContract);

  if (enabledFeatureKeys) {
    appFeaturesService.setAppFeaturesConfigurator({
      security: jest.fn().mockReturnValue(
        new Map(
          enabledFeatureKeys.map((key) => [
            key,
            {
              privileges: {
                all: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
                read: {
                  ui: ['entity-analytics'],
                  api: [`test-entity-analytics`],
                },
              },
            },
          ])
        )
      ),
      cases: jest.fn(),
      securityAssistant: jest.fn(),
    });
  }

  return appFeaturesService;
};
