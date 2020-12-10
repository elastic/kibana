/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ConfigType } from '../config';
import { SecurityLicense } from '../../common/licensing';

interface Usage {
  auditLoggingEnabled: boolean;
  loginSelectorEnabled: boolean;
  accessAgreementEnabled: boolean;
  authProviderCount: number;
  enabledAuthProviders: string[];
  httpAuthSchemes: string[];
}

interface Deps {
  usageCollection?: UsageCollectionSetup;
  config: ConfigType;
  license: SecurityLicense;
}

// List of auth schemes collected from https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml
const WELL_KNOWN_AUTH_SCHEMES = [
  'basic',
  'bearer',
  'digest',
  'hoba',
  'mutual',
  'negotiate',
  'oauth',
  'scram-sha-1',
  'scram-sha-256',
  'vapid',
  'apikey', // not part of the spec, but used by the Elastic Stack for API Key authentication
];

export function registerSecurityUsageCollector({ usageCollection, config, license }: Deps): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const securityCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'security',
    isReady: () => license.isLicenseAvailable(),
    schema: {
      auditLoggingEnabled: {
        type: 'boolean',
      },
      loginSelectorEnabled: {
        type: 'boolean',
      },
      accessAgreementEnabled: {
        type: 'boolean',
      },
      authProviderCount: {
        type: 'long',
      },
      enabledAuthProviders: {
        type: 'array',
        items: {
          type: 'keyword',
        },
      },
      httpAuthSchemes: {
        type: 'array',
        items: {
          type: 'keyword',
        },
      },
    },
    fetch: () => {
      const {
        allowRbac,
        allowAccessAgreement,
        allowAuditLogging,
        allowLegacyAuditLogging,
      } = license.getFeatures();
      if (!allowRbac) {
        return {
          auditLoggingEnabled: false,
          loginSelectorEnabled: false,
          accessAgreementEnabled: false,
          authProviderCount: 0,
          enabledAuthProviders: [],
          httpAuthSchemes: [],
        };
      }

      const legacyAuditLoggingEnabled = allowLegacyAuditLogging && config.audit.enabled;
      const auditLoggingEnabled =
        allowAuditLogging && config.audit.enabled && config.audit.appender != null;

      const loginSelectorEnabled = config.authc.selector.enabled;
      const authProviderCount = config.authc.sortedProviders.length;
      const enabledAuthProviders = [
        ...new Set(
          config.authc.sortedProviders.reduce(
            (acc, provider) => [...acc, provider.type],
            [] as string[]
          )
        ),
      ];
      const accessAgreementEnabled =
        allowAccessAgreement &&
        config.authc.sortedProviders.some((provider) => provider.hasAccessAgreement);

      const httpAuthSchemes = config.authc.http.schemes.filter((scheme) =>
        WELL_KNOWN_AUTH_SCHEMES.includes(scheme.toLowerCase())
      );

      return {
        auditLoggingEnabled: legacyAuditLoggingEnabled || auditLoggingEnabled,
        loginSelectorEnabled,
        accessAgreementEnabled,
        authProviderCount,
        enabledAuthProviders,
        httpAuthSchemes,
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(securityCollector);
}
