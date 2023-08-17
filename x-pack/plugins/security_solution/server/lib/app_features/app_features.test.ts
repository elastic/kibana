/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatures } from '.';
import type { AppFeatureKeys, ExperimentalFeatures } from '../../../common';
import type { PluginSetupContract } from '@kbn/features-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

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

jest.mock('./security_assistant_kibana_sub_features', () => {
  return {
    assistantSubFeaturesMap: new Map([['subFeature1', { baz: 'baz' }]]),
  };
});

describe('AppFeatures', () => {
  it('should register enabled kibana features', () => {
    const featuresSetup = {
      registerKibanaFeature: jest.fn(),
      getKibanaFeatures: jest.fn(),
    } as unknown as PluginSetupContract;

    const appFeatureKeys = ['test-base-feature'] as unknown as AppFeatureKeys;

    const appFeatures = new AppFeatures(
      loggingSystemMock.create().get('mock'),
      [] as unknown as ExperimentalFeatures
    );
    appFeatures.init(featuresSetup);
    appFeatures.set(appFeatureKeys);

    expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
      ...SECURITY_BASE_CONFIG,
      ...SECURITY_APP_FEATURE_CONFIG['test-base-feature'],
      subFeatures: [{ baz: 'baz' }],
    });
  });

  it('should register enabled cases features', () => {
    const featuresSetup = {
      registerKibanaFeature: jest.fn(),
    } as unknown as PluginSetupContract;

    const appFeatureKeys = ['test-cases-feature'] as unknown as AppFeatureKeys;

    const appFeatures = new AppFeatures(
      loggingSystemMock.create().get('mock'),
      [] as unknown as ExperimentalFeatures
    );
    appFeatures.init(featuresSetup);
    appFeatures.set(appFeatureKeys);

    expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
      ...CASES_BASE_CONFIG,
      ...CASES_APP_FEATURE_CONFIG['test-cases-feature'],
      subFeatures: [{ baz: 'baz' }],
    });
  });

  it('should register enabled assistant features', () => {
    const featuresSetup = {
      registerKibanaFeature: jest.fn(),
    } as unknown as PluginSetupContract;

    const appFeatureKeys = ['test-assistant-feature'] as unknown as AppFeatureKeys;

    const appFeatures = new AppFeatures(
      loggingSystemMock.create().get('mock'),
      [] as unknown as ExperimentalFeatures
    );
    appFeatures.init(featuresSetup);
    appFeatures.set(appFeatureKeys);

    expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
      ...ASSISTANT_BASE_CONFIG,
      ...ASSISTANT_APP_FEATURE_CONFIG['test-assistant-feature'],
      subFeatures: [{ baz: 'baz' }],
    });
  });
});
