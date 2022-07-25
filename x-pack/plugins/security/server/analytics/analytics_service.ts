/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup as CoreAnalyticsServiceSetup, Logger } from '@kbn/core/server';

export const AUTHENTICATION_TYPE_EVENT_TYPE = 'security_authentication_type';

export interface AnalyticsServiceSetupParams {
  analytics: CoreAnalyticsServiceSetup;
}

export interface AnalyticsServiceSetup {
  /**
   * Registers event describing the type of the authentication used to authenticate user's request.
   * @param event Instance of the AuthenticationTypeEvent.
   */
  reportAuthenticationTypeEvent(event: AuthenticationTypeAnalyticsEvent): void;
}

/**
 * Describes the shape of the authentication type event.
 */
export interface AuthenticationTypeAnalyticsEvent {
  /**
   * Type of the Kibana authentication provider (`basic`, `saml`, `pki` etc.).
   */
  authenticationProviderType: string;

  /**
   * Type of the Elasticsearch security realm (`native`, `ldap`, `file` etc.).
   */
  authenticationRealmType: string;

  /**
   * If user is authenticated using HTTP authentication this field will include
   * HTTP authentication scheme (`Basic`, `Bearer`, `ApiKey` etc.).
   */
  httpAuthenticationScheme?: string;
}

/**
 * Service that interacts with the Core's analytics module to collect usage of
 * the various Security plugin features (e.g. type of the authentication used).
 */
export class AnalyticsService {
  constructor(private readonly logger: Logger) {}

  public setup({ analytics }: AnalyticsServiceSetupParams): AnalyticsServiceSetup {
    this.logger.debug(`Registering ${AUTHENTICATION_TYPE_EVENT_TYPE} event type.`);

    analytics.registerEventType({
      eventType: AUTHENTICATION_TYPE_EVENT_TYPE,
      schema: {
        authentication_provider_type: {
          type: 'keyword',
          _meta: {
            description: 'Type of the Kibana authentication provider.',
            optional: false,
          },
        },
        authentication_realm_type: {
          type: 'keyword',
          _meta: {
            description: 'Type of the Elasticsearch security realm.',
            optional: false,
          },
        },
        http_authentication_scheme: {
          type: 'keyword',
          _meta: {
            description:
              'Authentication scheme from the `Authorization` HTTP header, if present in the client request.',
            // The field is populated only if authentication_provider_type === `http`.
            optional: true,
          },
        },
      },
    });

    return {
      reportAuthenticationTypeEvent(event: AuthenticationTypeAnalyticsEvent) {
        analytics.reportEvent(AUTHENTICATION_TYPE_EVENT_TYPE, {
          authentication_provider_type: event.authenticationProviderType.toLowerCase(),
          authentication_realm_type: event.authenticationRealmType.toLowerCase(),
          http_authentication_scheme: event.httpAuthenticationScheme?.toLowerCase(),
        });
      },
    };
  }
}
