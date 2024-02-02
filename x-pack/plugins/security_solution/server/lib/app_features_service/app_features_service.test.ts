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
  AppFeatureKibanaConfig,
  BaseKibanaFeatureConfig,
} from '@kbn/security-solution-features';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';

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

// sub-features definition

const SUB_FEATURE: SubFeatureConfig = {
  name: 'subFeature1',
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'subFeature1',
          name: 'subFeature1',
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['subFeature1-action'],
          api: ['subFeature1-action'],
        },
      ],
    },
  ],
};
const SUB_FEATURE_2: SubFeatureConfig = {
  name: 'subFeature2',
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'subFeature2',
          name: 'subFeature2',
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['subFeature2-action'],
          api: ['subFeature2-action'],
        },
      ],
    },
  ],
};

const subFeaturesMap = new Map([
  [SUB_FEATURE.name, SUB_FEATURE],
  [SUB_FEATURE_2.name, SUB_FEATURE_2],
]);

// app features configs
const testSubFeaturePrivilegeConfig: AppFeatureKibanaConfig = {
  subFeatureIds: [SUB_FEATURE.name],
};

const testFeaturePrivilegeConfig: AppFeatureKibanaConfig = {
  privileges: {
    all: {
      ui: ['test-action'],
      api: ['test-action'],
    },
    read: {
      ui: ['test-action'],
      api: ['test-action'],
    },
  },
};

const expectedBaseWithTestConfigPrivileges = {
  privileges: {
    all: {
      api: ['api-read', 'api-write', 'test-action'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read', 'test-action'],
    },
    read: {
      api: ['api-read', 'test-action'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read', 'test-action'],
    },
  },
};

describe('AppFeatures', () => {
  describe('setConfig', () => {
    it('should register base kibana features', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
        getKibanaFeatures: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(new Map());

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        subFeatures: [],
      });
    });

    it('should register enabled kibana features', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
        getKibanaFeatures: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig]])
      );

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [],
      });
    });

    it('should register enabled kibana features and sub features', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
        getKibanaFeatures: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([
          ['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig],
          ['test-sub-feature' as AppFeatureKeyType, testSubFeaturePrivilegeConfig],
        ])
      );

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [SUB_FEATURE],
      });
    });

    it('should register enabled kibana features and default sub features', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
        getKibanaFeatures: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        [SUB_FEATURE_2.name]
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([
          ['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig],
          ['test-sub-feature' as AppFeatureKeyType, testSubFeaturePrivilegeConfig],
        ])
      );

      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        ...baseKibanaFeature,
        ...expectedBaseWithTestConfigPrivileges,
        subFeatures: [SUB_FEATURE, SUB_FEATURE_2],
      });
    });
  });

  describe('isActionRegistered', () => {
    it('should register base privilege actions', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(new Map());

      expect(appFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:test-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:test-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('api:subFeature1-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register config privilege actions', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig]])
      );

      expect(appFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:subFeature1-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register config sub-feature privilege actions', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        []
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([
          ['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig],
          ['test-sub-feature' as AppFeatureKeyType, testSubFeaturePrivilegeConfig],
        ])
      );

      expect(appFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:subFeature1-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:subFeature2-action')).toEqual(false);
      expect(appFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(false);
    });

    it('should register default and config sub-feature privilege actions', () => {
      const featuresSetup = {
        registerKibanaFeature: jest.fn(),
      } as unknown as PluginSetupContract;

      const appFeatures = new AppFeatures(
        loggingSystemMock.create().get('mock'),
        subFeaturesMap,
        baseKibanaFeature,
        [SUB_FEATURE_2.name]
      );
      appFeatures.init(featuresSetup);
      appFeatures.setConfig(
        new Map([
          ['test-feature' as AppFeatureKeyType, testFeaturePrivilegeConfig],
          ['test-sub-feature' as AppFeatureKeyType, testSubFeaturePrivilegeConfig],
        ])
      );

      expect(appFeatures.isActionRegistered('api:api-read')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:read')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:api-write')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:write')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:test-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:subFeature1-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:subFeature1-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('api:subFeature2-action')).toEqual(true);
      expect(appFeatures.isActionRegistered('ui:subFeature2-action')).toEqual(true);
    });
  });
});
