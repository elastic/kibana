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

const SECURITY_BASE_CONFIG = {
  foo: 'foo',
};

const SECURITY_APP_FEATURE_CONFIG = {
  'test-base-feature': {
    privileges: {
      all: {
        ui: ['test-capability'],
        api: ['test-capability'],
      },
      read: {
        ui: ['test-capability'],
        api: ['test-capability'],
      },
    },
  },
};

const CASES_BASE_CONFIG = {
  bar: 'bar',
};

const CASES_APP_FEATURE_CONFIG = {
  'test-cases-feature': {
    privileges: {
      all: {
        ui: ['test-cases-capability'],
        api: ['test-cases-capability'],
      },
      read: {
        ui: ['test-cases-capability'],
        api: ['test-cases-capability'],
      },
    },
  },
};

const ASSISTANT_BASE_CONFIG = {
  bar: 'bar',
};

const ASSISTANT_APP_FEATURE_CONFIG = {
  'test-assistant-feature': {
    privileges: {
      all: {
        ui: ['test-assistant-capability'],
        api: ['test-assistant-capability'],
      },
      read: {
        ui: ['test-assistant-capability'],
        api: ['test-assistant-capability'],
      },
    },
  },
};

jest.mock('./security_kibana_features', () => {
  return {
    getSecurityBaseKibanaFeature: jest.fn(() => SECURITY_BASE_CONFIG),
    getSecurityBaseKibanaSubFeatureIds: jest.fn(() => ['subFeature1']),
    getSecurityAppFeaturesConfig: jest.fn(() => SECURITY_APP_FEATURE_CONFIG),
  };
});
jest.mock('./security_kibana_sub_features', () => {
  return {
    securitySubFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
  };
});

jest.mock('./security_cases_kibana_features', () => {
  return {
    getCasesBaseKibanaFeature: jest.fn(() => CASES_BASE_CONFIG),
    getCasesBaseKibanaSubFeatureIds: jest.fn(() => ['subFeature1']),
    getCasesAppFeaturesConfig: jest.fn(() => CASES_APP_FEATURE_CONFIG),
  };
});

jest.mock('./security_cases_kibana_sub_features', () => {
  return {
    casesSubFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
  };
});

jest.mock('./security_assistant_kibana_features', () => {
  return {
    getAssistantBaseKibanaFeature: jest.fn(() => ASSISTANT_BASE_CONFIG),
    getAssistantBaseKibanaSubFeatureIds: jest.fn(() => ['subFeature1']),
    getAssistantAppFeaturesConfig: jest.fn(() => ASSISTANT_APP_FEATURE_CONFIG),
  };
});

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
      cases: jest.fn().mockReturnValue(
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
      securityAssistant: jest.fn().mockReturnValue(
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
    });
  }

  return appFeaturesService;
};
