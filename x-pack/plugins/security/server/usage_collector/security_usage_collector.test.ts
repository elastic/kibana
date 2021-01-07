/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createConfig, ConfigSchema } from '../config';
import { loggingSystemMock } from 'src/core/server/mocks';
import { TypeOf } from '@kbn/config-schema';
import {
  usageCollectionPluginMock,
  createCollectorFetchContextMock,
} from 'src/plugins/usage_collection/server/mocks';
import { registerSecurityUsageCollector } from './security_usage_collector';
import { licenseMock } from '../../common/licensing/index.mock';
import { SecurityLicenseFeatures } from '../../common/licensing';

describe('Security UsageCollector', () => {
  const createSecurityConfig = (config: TypeOf<typeof ConfigSchema>) => {
    return createConfig(config, loggingSystemMock.createLogger(), { isTLSEnabled: true });
  };

  const createSecurityLicense = ({
    allowAccessAgreement = true,
    allowAuditLogging = true,
    allowRbac = true,
    isLicenseAvailable,
  }: Partial<SecurityLicenseFeatures> & { isLicenseAvailable: boolean }) => {
    const license = licenseMock.create();
    license.isLicenseAvailable.mockReturnValue(isLicenseAvailable);
    license.getFeatures.mockReturnValue({
      allowAccessAgreement,
      allowAuditLogging,
      allowLegacyAuditLogging: allowAuditLogging,
      allowRbac,
    } as SecurityLicenseFeatures);
    return license;
  };

  const collectorFetchContext = createCollectorFetchContextMock();

  describe('initialization', () => {
    it('handles an undefined usage collector', () => {
      const config = createSecurityConfig(ConfigSchema.validate({}));
      const usageCollection = undefined;
      const license = createSecurityLicense({ allowRbac: false, isLicenseAvailable: false });
      registerSecurityUsageCollector({ usageCollection, config, license });
    });

    it('registers itself and waits for the license to become available before reporting itself as ready', async () => {
      const config = createSecurityConfig(ConfigSchema.validate({}));
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ allowRbac: false, isLicenseAvailable: false });

      registerSecurityUsageCollector({ usageCollection, config, license });

      expect(usageCollection.getCollectorByType('security')?.isReady()).toBe(false);

      license.isLicenseAvailable.mockReturnValue(true);
      license.getFeatures.mockReturnValue({ allowRbac: true } as SecurityLicenseFeatures);

      expect(usageCollection.getCollectorByType('security')?.isReady()).toBe(true);
    });
  });

  it('reports correctly for a default configuration', async () => {
    const config = createSecurityConfig(ConfigSchema.validate({}));
    const usageCollection = usageCollectionPluginMock.createSetupContract();
    const license = createSecurityLicense({ isLicenseAvailable: true });
    registerSecurityUsageCollector({ usageCollection, config, license });

    const usage = await usageCollection
      .getCollectorByType('security')
      ?.fetch(collectorFetchContext);

    expect(usage).toEqual({
      auditLoggingEnabled: false,
      accessAgreementEnabled: false,
      authProviderCount: 1,
      enabledAuthProviders: ['basic'],
      loginSelectorEnabled: false,
      httpAuthSchemes: ['apikey'],
    });
  });

  it('reports correctly when security is disabled in Elasticsearch', async () => {
    const config = createSecurityConfig(ConfigSchema.validate({}));
    const usageCollection = usageCollectionPluginMock.createSetupContract();
    const license = createSecurityLicense({ allowRbac: false, isLicenseAvailable: true });

    registerSecurityUsageCollector({ usageCollection, config, license });

    const usage = await usageCollection
      .getCollectorByType('security')
      ?.fetch(collectorFetchContext);

    expect(usage).toEqual({
      auditLoggingEnabled: false,
      accessAgreementEnabled: false,
      authProviderCount: 0,
      enabledAuthProviders: [],
      loginSelectorEnabled: false,
      httpAuthSchemes: [],
    });
  });

  describe('auth providers', () => {
    it('does not report disabled auth providers', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: {
                basic: {
                  order: 0,
                },
                disabledBasic: {
                  enabled: false,
                  order: 1,
                },
              },
              saml: {
                disabledSaml: {
                  enabled: false,
                  realm: 'foo',
                  order: 2,
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['basic'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });

    it('reports the types and count of enabled auth providers', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: {
                basic: {
                  order: 0,
                  enabled: false,
                },
              },
              saml: {
                saml1: {
                  realm: 'foo',
                  order: 1,
                },
                saml2: {
                  realm: 'bar',
                  order: 2,
                },
              },
              pki: {
                pki1: {
                  enabled: true,
                  order: 3,
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 3,
        enabledAuthProviders: ['saml', 'pki'],
        loginSelectorEnabled: true,
        httpAuthSchemes: ['apikey'],
      });
    });
  });

  describe('access agreement', () => {
    it('reports if the access agreement message is configured for any provider', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              saml: {
                saml1: {
                  realm: 'foo',
                  order: 1,
                  accessAgreement: {
                    message: 'foo message',
                  },
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: true,
        authProviderCount: 1,
        enabledAuthProviders: ['saml'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });
    it('does not report the access agreement if the license does not permit it', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              saml: {
                saml1: {
                  realm: 'foo',
                  order: 1,
                  accessAgreement: {
                    message: 'foo message',
                  },
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({
        isLicenseAvailable: true,
        allowAccessAgreement: false,
      });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['saml'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });

    it('does not report the access agreement for disabled providers', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              saml: {
                saml1: {
                  enabled: false,
                  realm: 'foo',
                  order: 1,
                  accessAgreement: {
                    message: 'foo message',
                  },
                },
                saml2: {
                  realm: 'foo',
                  order: 2,
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['saml'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });
  });

  describe('login selector', () => {
    it('reports when the login selector is enabled', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            selector: {
              enabled: true,
            },
            providers: {
              saml: {
                saml1: {
                  realm: 'foo',
                  order: 1,
                  showInSelector: true,
                },
              },
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['saml'],
        loginSelectorEnabled: true,
        httpAuthSchemes: ['apikey'],
      });
    });
  });

  describe('audit logging', () => {
    it('reports when audit logging is enabled', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          audit: {
            enabled: true,
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true, allowAuditLogging: true });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: true,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['basic'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });

    it('does not report audit logging when the license does not permit it', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          audit: {
            enabled: true,
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true, allowAuditLogging: false });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['basic'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['apikey'],
      });
    });
  });

  describe('http auth schemes', () => {
    it('reports customized http auth schemes', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            http: {
              schemes: ['basic', 'Negotiate'],
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true, allowAuditLogging: false });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['basic'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['basic', 'Negotiate'],
      });
    });

    it('does not report auth schemes that are not "well known"', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          authc: {
            http: {
              schemes: ['basic', 'Negotiate', 'customScheme'],
            },
          },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true, allowAuditLogging: false });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        auditLoggingEnabled: false,
        accessAgreementEnabled: false,
        authProviderCount: 1,
        enabledAuthProviders: ['basic'],
        loginSelectorEnabled: false,
        httpAuthSchemes: ['basic', 'Negotiate'],
      });
    });
  });
});
