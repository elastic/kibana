/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract } from '@kbn/features-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AppFeatures } from './app_features';
import type {
  AppFeatureKeyType,
  AppFeaturesConfig,
  AppSubFeaturesMap,
  BaseKibanaFeatureConfig,
} from '@kbn/security-solution-features';

const category = {
  id: 'security',
  label: 'Security app category',
};

const baseKibanaFeature: BaseKibanaFeatureConfig = {
  id: 'FEATURE_ID',
  name: 'Base Feature',
  order: 1100,
  app: ['FEATURE_ID', 'kibana'],
  catalogue: ['APP_ID'],
  privileges: {
    all: {
      api: ['api-read', 'api-write'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read'],
    },
    read: {
      api: ['api-read'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read'],
    },
  },
  category,
};

const privileges = {
  privileges: {
    all: {
      api: ['api-read', 'api-write', 'test-capability'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read', 'test-capability'],
    },
    read: {
      api: ['api-read', 'test-capability'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read', 'test-capability'],
    },
  },
};

const SECURITY_APP_FEATURE_CONFIG: AppFeaturesConfig<string> = new Map();
SECURITY_APP_FEATURE_CONFIG.set('test-base-feature' as AppFeatureKeyType, {
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
});

const CASES_BASE_CONFIG = {
  privileges: {
    all: {
      api: ['api-read', 'api-write', 'test-cases-capability'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read', 'test-cases-capability'],
    },
    read: {
      api: ['api-read', 'test-cases-capability'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read', 'test-cases-capability'],
    },
  },
};

const CASES_APP_FEATURE_CONFIG: AppFeaturesConfig<string> = new Map();
CASES_APP_FEATURE_CONFIG.set('test-cases-feature' as AppFeatureKeyType, {
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
});

const securityKibanaSubFeatures = {
  securitySubFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
};

const securityCasesKibanaSubFeatures = {
  casesSubFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
};

describe('AppFeatures', () => {
  it('should register enabled kibana features', () => {
    const featuresSetup = {
      registerKibanaFeature: jest.fn(),
      getKibanaFeatures: jest.fn(),
    } as unknown as PluginSetupContract;

    const appFeatures = new AppFeatures(
      loggingSystemMock.create().get('mock'),
      securityKibanaSubFeatures.securitySubFeaturesMap as unknown as AppSubFeaturesMap<string>,
      baseKibanaFeature,
      ['subFeature1']
    );
    appFeatures.init(featuresSetup);
    appFeatures.setConfig(SECURITY_APP_FEATURE_CONFIG);

    expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
      ...baseKibanaFeature,
      ...SECURITY_APP_FEATURE_CONFIG.get('test-base-feature' as AppFeatureKeyType),
      ...privileges,
      subFeatures: [{ baz: 'baz' }],
    });
  });

  it('should register enabled cases features', () => {
    const featuresSetup = {
      registerKibanaFeature: jest.fn(),
    } as unknown as PluginSetupContract;

    const appFeatures = new AppFeatures(
      loggingSystemMock.create().get('mock'),
      securityCasesKibanaSubFeatures.casesSubFeaturesMap as unknown as AppSubFeaturesMap<string>,
      baseKibanaFeature,
      ['subFeature1']
    );
    appFeatures.init(featuresSetup);
    appFeatures.setConfig(CASES_APP_FEATURE_CONFIG);

    expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
      ...baseKibanaFeature,
      ...CASES_APP_FEATURE_CONFIG.get('test-cases-feature' as AppFeatureKeyType),
      subFeatures: [{ baz: 'baz' }],
      ...CASES_BASE_CONFIG,
    });
  });
});
