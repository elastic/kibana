/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { loggingSystemMock } from 'src/core/server/mocks';
import {
  createCollectorFetchContextMock,
  usageCollectionPluginMock,
} from 'src/plugins/usage_collection/server/mocks';

import type { SecurityLicenseFeatures } from '../../common/licensing';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, createConfig } from '../config';
import { registerSecurityUsageCollector } from './security_usage_collector';

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
      allowRbac,
    } as SecurityLicenseFeatures);
    return license;
  };

  const collectorFetchContext = createCollectorFetchContextMock();
  const DEFAULT_USAGE = {
    auditLoggingEnabled: false,
    accessAgreementEnabled: false,
    authProviderCount: 1,
    enabledAuthProviders: ['basic'],
    loginSelectorEnabled: false,
    httpAuthSchemes: ['apikey', 'bearer'],
    sessionIdleTimeoutInMinutes: 480,
    sessionLifespanInMinutes: 43200,
    sessionCleanupInMinutes: 60,
  };

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

    expect(usage).toEqual(DEFAULT_USAGE);
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
      sessionIdleTimeoutInMinutes: 0,
      sessionLifespanInMinutes: 0,
      sessionCleanupInMinutes: 0,
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

      expect(usage).toEqual(DEFAULT_USAGE);
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
        ...DEFAULT_USAGE,
        authProviderCount: 3,
        enabledAuthProviders: ['saml', 'pki'],
        loginSelectorEnabled: true,
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
        ...DEFAULT_USAGE,
        accessAgreementEnabled: true,
        enabledAuthProviders: ['saml'],
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
        ...DEFAULT_USAGE,
        accessAgreementEnabled: false,
        enabledAuthProviders: ['saml'],
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
        ...DEFAULT_USAGE,
        accessAgreementEnabled: false,
        enabledAuthProviders: ['saml'],
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
        ...DEFAULT_USAGE,
        enabledAuthProviders: ['saml'],
        loginSelectorEnabled: true,
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
      const license = createSecurityLicense({
        isLicenseAvailable: true,
        allowAuditLogging: true,
      });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        ...DEFAULT_USAGE,
        auditLoggingEnabled: true,
      });
    });

    it('does not report audit logging when the license does not permit it', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          audit: {
            enabled: true,
            appender: { type: 'console', layout: { type: 'json' } },
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
        ...DEFAULT_USAGE,
        auditLoggingEnabled: false,
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
        ...DEFAULT_USAGE,
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
        ...DEFAULT_USAGE,
        httpAuthSchemes: ['basic', 'Negotiate'],
      });
    });
  });

  describe('session', () => {
    // Note: can't easily test deprecated 'sessionTimeout' value here because of the way that config deprecation renaming works
    it('reports customized session idleTimeout, lifespan, and cleanupInterval', async () => {
      const config = createSecurityConfig(
        ConfigSchema.validate({
          session: { idleTimeout: '123m', lifespan: '456m', cleanupInterval: '789m' },
        })
      );
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      const license = createSecurityLicense({ isLicenseAvailable: true, allowAuditLogging: false });
      registerSecurityUsageCollector({ usageCollection, config, license });

      const usage = await usageCollection
        .getCollectorByType('security')
        ?.fetch(collectorFetchContext);

      expect(usage).toEqual({
        ...DEFAULT_USAGE,
        sessionIdleTimeoutInMinutes: 123,
        sessionLifespanInMinutes: 456,
        sessionCleanupInMinutes: 789,
      });
    });
  });
});
