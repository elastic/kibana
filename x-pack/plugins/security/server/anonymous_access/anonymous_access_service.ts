/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import {
  CapabilitiesStart,
  IBasePath,
  KibanaRequest,
  Logger,
  Capabilities,
  IClusterClient,
} from '../../../../../src/core/server';
import { addSpaceIdToPath } from '../../../spaces/common';
import type { SpacesServiceStart } from '../../../spaces/server';
import { AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER } from '../../common/constants';
import { AnonymousAuthenticationProvider, HTTPAuthorizationHeader } from '../authentication';
import type { ConfigType } from '../config';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export interface AnonymousAccessServiceStart {
  readonly isAnonymousAccessEnabled: boolean;
  // We cannot use `ReadonlyMap` just yet: https://github.com/microsoft/TypeScript/issues/16840
  readonly accessURLParameters: Readonly<Map<string, string>> | null;
  getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}

interface AnonymousAccessServiceStartParams {
  basePath: IBasePath;
  capabilities: CapabilitiesStart;
  clusterClient: IClusterClient;
  spaces?: SpacesServiceStart;
}

/**
 * Service that manages various aspects of the anonymous access.
 */
export class AnonymousAccessService {
  /**
   * Indicates whether anonymous access is enabled.
   */
  private isAnonymousAccessEnabled = false;

  /**
   * Defines HTTP authorization header that should be used to authenticate request.
   */
  private httpAuthorizationHeader: HTTPAuthorizationHeader | null = null;

  constructor(private readonly logger: Logger, private readonly getConfig: () => ConfigType) {}

  setup() {
    const config = this.getConfig();
    const anonymousProvider = config.authc.sortedProviders.find(
      ({ type }) => type === AnonymousAuthenticationProvider.type
    );

    this.isAnonymousAccessEnabled = !!anonymousProvider;
    this.httpAuthorizationHeader = anonymousProvider
      ? AnonymousAuthenticationProvider.createHTTPAuthorizationHeader(
          (config.authc.providers.anonymous![anonymousProvider.name] as Record<string, any>)
            .credentials
        )
      : null;
  }

  start({
    basePath,
    capabilities,
    clusterClient,
    spaces,
  }: AnonymousAccessServiceStartParams): AnonymousAccessServiceStart {
    const config = this.getConfig();
    const anonymousProvider = config.authc.sortedProviders.find(
      ({ type }) => type === AnonymousAuthenticationProvider.type
    );
    // We don't need to add any special parameters to the URL if any of the following is true:
    // * anonymous provider isn't enabled
    // * anonymous provider is enabled, but it's a default authentication mechanism
    const anonymousIsDefault =
      !config.authc.selector.enabled && anonymousProvider === config.authc.sortedProviders[0];

    return {
      isAnonymousAccessEnabled: this.isAnonymousAccessEnabled,
      accessURLParameters:
        anonymousProvider && !anonymousIsDefault
          ? Object.freeze(
              new Map([[AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER, anonymousProvider.name]])
            )
          : null,
      getCapabilities: async (request) => {
        this.logger.debug('Retrieving capabilities of the anonymous service account.');

        let useDefaultCapabilities = false;
        if (!this.isAnonymousAccessEnabled) {
          this.logger.warn(
            'Default capabilities will be returned since anonymous access is not enabled.'
          );
          useDefaultCapabilities = true;
        } else if (!(await this.canAuthenticateAnonymousServiceAccount(clusterClient))) {
          this.logger.warn(
            `Default capabilities will be returned since anonymous service account cannot authenticate.`
          );
          useDefaultCapabilities = true;
        }

        // We should use credentials of the anonymous service account instead of credentials of the
        // current user to get capabilities relevant to the anonymous access itself.
        const fakeAnonymousRequest = this.createFakeAnonymousRequest({
          authenticateRequest: !useDefaultCapabilities,
        });
        const spaceId = spaces?.getSpaceId(request);
        if (spaceId) {
          basePath.set(fakeAnonymousRequest, addSpaceIdToPath('/', spaceId));
        }

        try {
          return await capabilities.resolveCapabilities(fakeAnonymousRequest, {
            useDefaultCapabilities,
          });
        } catch (err) {
          this.logger.error(
            `Failed to retrieve anonymous service account capabilities: ${getDetailedErrorMessage(
              err
            )}`
          );
          throw err;
        }
      },
    };
  }

  /**
   * Checks if anonymous service account can authenticate to Elasticsearch using currently configured credentials.
   * @param clusterClient
   */
  private async canAuthenticateAnonymousServiceAccount(clusterClient: IClusterClient) {
    try {
      await clusterClient
        .asScoped(this.createFakeAnonymousRequest({ authenticateRequest: true }))
        .asCurrentUser.security.authenticate();
    } catch (err) {
      this.logger.warn(
        `Failed to authenticate anonymous service account: ${getDetailedErrorMessage(err)}`
      );

      if (getErrorStatusCode(err) === 401) {
        return false;
      }
      throw err;
    }

    return true;
  }

  /**
   * Creates a fake Kibana request optionally attributed with the anonymous service account
   * credentials to get the list of capabilities.
   * @param authenticateRequest Indicates whether or not we should include authorization header with
   * anonymous service account credentials.
   */
  private createFakeAnonymousRequest({ authenticateRequest }: { authenticateRequest: boolean }) {
    return KibanaRequest.from(({
      headers:
        authenticateRequest && this.httpAuthorizationHeader
          ? { authorization: this.httpAuthorizationHeader.toString() }
          : {},
      // This flag is essential for the security capability switcher that relies on it to decide if
      // it should perform a privileges check or automatically disable all capabilities.
      auth: { isAuthenticated: authenticateRequest },
      path: '/',
      route: { settings: {} },
      url: { href: '/' },
      raw: { req: { url: '/' } },
    } as unknown) as Request);
  }
}
