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

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import { allowedExperimentalValues, type ExperimentalFeatures } from '../../../common';
import { ProductFeaturesService } from './product_features_service';

const SECURITY_BASE_CONFIG = {
  foo: 'foo',
};

const CASES_BASE_CONFIG = {
  bar: 'bar',
};

const ASSISTANT_BASE_CONFIG = {
  bar: 'bar',
};

jest.mock('@kbn/security-solution-features/product_features', () => ({
  getSecurityFeature: jest.fn(() => ({
    baseKibanaFeature: SECURITY_BASE_CONFIG,
    baseKibanaSubFeatureIds: ['subFeature1'],
    subFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
  })),
  getCasesFeature: jest.fn(() => ({
    baseKibanaFeature: CASES_BASE_CONFIG,
    baseKibanaSubFeatureIds: ['subFeature1'],
    subFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
  })),
  getAssistantFeature: jest.fn(() => ({
    baseKibanaFeature: ASSISTANT_BASE_CONFIG,
    baseKibanaSubFeatureIds: [],
    subFeaturesMap: new Map([]),
  })),
}));

export const createProductFeaturesServiceMock = (
  /** What features keys should be enabled. Default is all */
  enabledFeatureKeys: ProductFeatureKeys = [...ALL_PRODUCT_FEATURE_KEYS],
  experimentalFeatures: ExperimentalFeatures = { ...allowedExperimentalValues },
  featuresPluginSetupContract: FeaturesPluginSetup = featuresPluginMock.createSetup(),
  logger: Logger = loggingSystemMock.create().get('productFeatureMock')
) => {
  const productFeaturesService = new ProductFeaturesService(logger, experimentalFeatures);

  productFeaturesService.init(featuresPluginSetupContract);

  if (enabledFeatureKeys) {
    productFeaturesService.setProductFeaturesConfigurator({
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

  return productFeaturesService;
};
