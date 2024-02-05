/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeaturesService } from './app_features_service';
import { AppFeatures } from './app_features';
import type { AppFeaturesConfig, BaseKibanaFeatureConfig } from '@kbn/security-solution-features';
import { loggerMock } from '@kbn/logging-mocks';
import type { ExperimentalFeatures } from '../../../common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { AppFeaturesConfigurator } from './types';
import type {
  AssistantSubFeatureId,
  CasesSubFeatureId,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import { AppFeatureKey } from '@kbn/security-solution-features/keys';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  KibanaRequest,
  LifecycleResponseFactory,
  OnPostAuthHandler,
} from '@kbn/core-http-server';

jest.mock('./app_features');
const MockedAppFeatures = AppFeatures as unknown as jest.MockedClass<typeof AppFeatures>;

const appFeature = {
  subFeaturesMap: new Map(),
  baseKibanaFeature: {} as BaseKibanaFeatureConfig,
  baseKibanaSubFeatureIds: [],
};
const mockGetFeature = jest.fn().mockReturnValue(appFeature);
jest.mock('@kbn/security-solution-features/app_features', () => ({
  getAssistantFeature: () => mockGetFeature(),
  getCasesFeature: () => mockGetFeature(),
  getSecurityFeature: () => mockGetFeature(),
}));

describe('AppFeaturesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create AppFeatureService instance', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    new AppFeaturesService(loggerMock.create(), experimentalFeatures);

    expect(mockGetFeature).toHaveBeenCalledTimes(3);
    expect(MockedAppFeatures).toHaveBeenCalledTimes(3);
  });

  it('should init all AppFeatures when initialized', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);

    const featuresSetup = featuresPluginMock.createSetup();
    appFeaturesService.init(featuresSetup);

    expect(MockedAppFeatures.mock.instances[0].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedAppFeatures.mock.instances[1].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedAppFeatures.mock.instances[2].init).toHaveBeenCalledWith(featuresSetup);
  });

  it('should configure AppFeatures', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);

    const featuresSetup = featuresPluginMock.createSetup();
    appFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map() as AppFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map() as AppFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map() as AppFeaturesConfig<AssistantSubFeatureId>;

    const configurator: AppFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
    };
    appFeaturesService.setAppFeaturesConfigurator(configurator);

    expect(configurator.security).toHaveBeenCalled();
    expect(configurator.cases).toHaveBeenCalled();
    expect(configurator.securityAssistant).toHaveBeenCalled();

    expect(MockedAppFeatures.mock.instances[0].setConfig).toHaveBeenCalledWith(mockSecurityConfig);
    expect(MockedAppFeatures.mock.instances[1].setConfig).toHaveBeenCalledWith(mockCasesConfig);
    expect(MockedAppFeatures.mock.instances[2].setConfig).toHaveBeenCalledWith(mockAssistantConfig);
  });

  it('should return isEnabled for enabled features', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);

    const featuresSetup = featuresPluginMock.createSetup();
    appFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map([
      [AppFeatureKey.advancedInsights, {}],
      [AppFeatureKey.endpointExceptions, {}],
    ]) as AppFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map([
      [AppFeatureKey.casesConnectors, {}],
    ]) as AppFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map([
      [AppFeatureKey.assistant, {}],
    ]) as AppFeaturesConfig<AssistantSubFeatureId>;

    const configurator: AppFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
    };
    appFeaturesService.setAppFeaturesConfigurator(configurator);

    expect(appFeaturesService.isEnabled(AppFeatureKey.advancedInsights)).toEqual(true);
    expect(appFeaturesService.isEnabled(AppFeatureKey.endpointExceptions)).toEqual(true);
    expect(appFeaturesService.isEnabled(AppFeatureKey.casesConnectors)).toEqual(true);
    expect(appFeaturesService.isEnabled(AppFeatureKey.assistant)).toEqual(true);
    expect(appFeaturesService.isEnabled(AppFeatureKey.externalRuleActions)).toEqual(false);
  });

  it('should call isApiPrivilegeEnabled for api actions', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);

    appFeaturesService.isApiPrivilegeEnabled('writeEndpointExceptions');

    expect(MockedAppFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedAppFeatures.mock.instances[1].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedAppFeatures.mock.instances[2].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
  });

  describe('registerApiAccessControl', () => {
    const mockHttpSetup = httpServiceMock.createSetupContract();
    let lastRegisteredFn: OnPostAuthHandler;
    mockHttpSetup.registerOnPostAuth.mockImplementation((fn) => {
      lastRegisteredFn = fn;
    });

    const getReq = (tags: string[] = []) =>
      ({
        route: { options: { tags } },
        url: { pathname: '', search: '' },
      } as unknown as KibanaRequest);
    const res = { notFound: jest.fn() } as unknown as LifecycleResponseFactory;
    const toolkit = { next: jest.fn() };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register api authorization http route interceptor', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      expect(mockHttpSetup.registerOnPostAuth).toHaveBeenCalledTimes(1);
    });

    it('should authorize when no tag matches', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      lastRegisteredFn(getReq(['access:something', 'access:securitySolution']), res, toolkit);

      expect(MockedAppFeatures.mock.instances[0].isActionRegistered).not.toHaveBeenCalled();
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });

    it('should check when tag matches and return not found when not action registered', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      (MockedAppFeatures.mock.instances[0].isActionRegistered as jest.Mock).mockReturnValueOnce(
        false
      );
      lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

      expect(MockedAppFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
        'api:securitySolution-foo'
      );
      expect(res.notFound).toHaveBeenCalledTimes(1);
      expect(toolkit.next).not.toHaveBeenCalled();
    });

    it('should check when tag matches and continue when action registered', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      (MockedAppFeatures.mock.instances[0].isActionRegistered as jest.Mock).mockReturnValueOnce(
        true
      );
      lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

      expect(MockedAppFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
        'api:securitySolution-foo'
      );
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });

    it('should check when appFeature tag when it matches and return not found when not enabled', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      appFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(false);

      lastRegisteredFn(getReq(['securitySolutionAppFeature:foo']), res, toolkit);

      expect(appFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
      expect(res.notFound).toHaveBeenCalledTimes(1);
      expect(toolkit.next).not.toHaveBeenCalled();
    });

    it('should check when appFeature tag when it matches and continue when enabled', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const appFeaturesService = new AppFeaturesService(loggerMock.create(), experimentalFeatures);
      appFeaturesService.registerApiAccessControl(mockHttpSetup);

      appFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(true);

      lastRegisteredFn(getReq(['securitySolutionAppFeature:foo']), res, toolkit);

      expect(appFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });
  });
});
