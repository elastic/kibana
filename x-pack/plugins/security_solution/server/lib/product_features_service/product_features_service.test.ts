/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeaturesService } from './product_features_service';
import { ProductFeatures } from './product_features';
import type {
  ProductFeaturesConfig,
  BaseKibanaFeatureConfig,
} from '@kbn/security-solution-features';
import { loggerMock } from '@kbn/logging-mocks';
import type { ExperimentalFeatures } from '../../../common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { ProductFeaturesConfigurator } from './types';
import type {
  AssistantSubFeatureId,
  CasesSubFeatureId,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  KibanaRequest,
  LifecycleResponseFactory,
  OnPostAuthHandler,
} from '@kbn/core-http-server';

jest.mock('./product_features');
const MockedProductFeatures = ProductFeatures as unknown as jest.MockedClass<
  typeof ProductFeatures
>;

const productFeature = {
  subFeaturesMap: new Map(),
  baseKibanaFeature: {} as BaseKibanaFeatureConfig,
  baseKibanaSubFeatureIds: [],
};
const mockGetFeature = jest.fn().mockReturnValue(productFeature);
jest.mock('@kbn/security-solution-features/product_features', () => ({
  getAssistantFeature: () => mockGetFeature(),
  getCasesFeature: () => mockGetFeature(),
  getSecurityFeature: () => mockGetFeature(),
}));

describe('ProductFeaturesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ProductFeatureService instance', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    new ProductFeaturesService(loggerMock.create(), experimentalFeatures);

    expect(mockGetFeature).toHaveBeenCalledTimes(3);
    expect(MockedProductFeatures).toHaveBeenCalledTimes(3);
  });

  it('should init all ProductFeatures when initialized', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    expect(MockedProductFeatures.mock.instances[0].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedProductFeatures.mock.instances[1].init).toHaveBeenCalledWith(featuresSetup);
    expect(MockedProductFeatures.mock.instances[2].init).toHaveBeenCalledWith(featuresSetup);
  });

  it('should configure ProductFeatures', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map() as ProductFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map() as ProductFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map() as ProductFeaturesConfig<AssistantSubFeatureId>;

    const configurator: ProductFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
    };
    productFeaturesService.setProductFeaturesConfigurator(configurator);

    expect(configurator.security).toHaveBeenCalled();
    expect(configurator.cases).toHaveBeenCalled();
    expect(configurator.securityAssistant).toHaveBeenCalled();

    expect(MockedProductFeatures.mock.instances[0].setConfig).toHaveBeenCalledWith(
      mockSecurityConfig
    );
    expect(MockedProductFeatures.mock.instances[1].setConfig).toHaveBeenCalledWith(mockCasesConfig);
    expect(MockedProductFeatures.mock.instances[2].setConfig).toHaveBeenCalledWith(
      mockAssistantConfig
    );
  });

  it('should return isEnabled for enabled features', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    const featuresSetup = featuresPluginMock.createSetup();
    productFeaturesService.init(featuresSetup);

    const mockSecurityConfig = new Map([
      [ProductFeatureKey.advancedInsights, {}],
      [ProductFeatureKey.endpointExceptions, {}],
    ]) as ProductFeaturesConfig<SecuritySubFeatureId>;
    const mockCasesConfig = new Map([
      [ProductFeatureKey.casesConnectors, {}],
    ]) as ProductFeaturesConfig<CasesSubFeatureId>;
    const mockAssistantConfig = new Map([
      [ProductFeatureKey.assistant, {}],
    ]) as ProductFeaturesConfig<AssistantSubFeatureId>;

    const configurator: ProductFeaturesConfigurator = {
      security: jest.fn(() => mockSecurityConfig),
      cases: jest.fn(() => mockCasesConfig),
      securityAssistant: jest.fn(() => mockAssistantConfig),
    };
    productFeaturesService.setProductFeaturesConfigurator(configurator);

    expect(productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.endpointExceptions)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.casesConnectors)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.assistant)).toEqual(true);
    expect(productFeaturesService.isEnabled(ProductFeatureKey.externalRuleActions)).toEqual(false);
  });

  it('should call isApiPrivilegeEnabled for api actions', () => {
    const experimentalFeatures = {} as ExperimentalFeatures;
    const productFeaturesService = new ProductFeaturesService(
      loggerMock.create(),
      experimentalFeatures
    );

    productFeaturesService.isApiPrivilegeEnabled('writeEndpointExceptions');

    expect(MockedProductFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedProductFeatures.mock.instances[1].isActionRegistered).toHaveBeenCalledWith(
      'api:securitySolution-writeEndpointExceptions'
    );
    expect(MockedProductFeatures.mock.instances[2].isActionRegistered).toHaveBeenCalledWith(
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
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      expect(mockHttpSetup.registerOnPostAuth).toHaveBeenCalledTimes(1);
    });

    it('should authorize when no tag matches', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      lastRegisteredFn(getReq(['access:something', 'access:securitySolution']), res, toolkit);

      expect(MockedProductFeatures.mock.instances[0].isActionRegistered).not.toHaveBeenCalled();
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });

    it('should check when tag matches and return not found when not action registered', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      (MockedProductFeatures.mock.instances[0].isActionRegistered as jest.Mock).mockReturnValueOnce(
        false
      );
      lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

      expect(MockedProductFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
        'api:securitySolution-foo'
      );
      expect(res.notFound).toHaveBeenCalledTimes(1);
      expect(toolkit.next).not.toHaveBeenCalled();
    });

    it('should check when tag matches and continue when action registered', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      (MockedProductFeatures.mock.instances[0].isActionRegistered as jest.Mock).mockReturnValueOnce(
        true
      );
      lastRegisteredFn(getReq(['access:securitySolution-foo']), res, toolkit);

      expect(MockedProductFeatures.mock.instances[0].isActionRegistered).toHaveBeenCalledWith(
        'api:securitySolution-foo'
      );
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });

    it('should check when productFeature tag when it matches and return not found when not enabled', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      productFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(false);

      lastRegisteredFn(getReq(['securitySolutionProductFeature:foo']), res, toolkit);

      expect(productFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
      expect(res.notFound).toHaveBeenCalledTimes(1);
      expect(toolkit.next).not.toHaveBeenCalled();
    });

    it('should check when productFeature tag when it matches and continue when enabled', () => {
      const experimentalFeatures = {} as ExperimentalFeatures;
      const productFeaturesService = new ProductFeaturesService(
        loggerMock.create(),
        experimentalFeatures
      );
      productFeaturesService.registerApiAccessControl(mockHttpSetup);

      productFeaturesService.isEnabled = jest.fn().mockReturnValueOnce(true);

      lastRegisteredFn(getReq(['securitySolutionProductFeature:foo']), res, toolkit);

      expect(productFeaturesService.isEnabled).toHaveBeenCalledWith('foo');
      expect(res.notFound).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
    });
  });
});
