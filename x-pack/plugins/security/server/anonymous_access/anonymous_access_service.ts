/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Request } from '@hapi/hapi';
import {
  CapabilitiesStart,
  IBasePath,
  KibanaRequest,
  Logger,
  Capabilities,
} from '../../../../../src/core/server';
import { addSpaceIdToPath } from '../../../spaces/common';
import type { SpacesServiceStart } from '../../../spaces/server';
import { AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER } from '../../common/constants';
import { AnonymousAuthenticationProvider } from '../authentication';
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
  spaces?: SpacesServiceStart;
}

const DEFAULT_CAPABILITIES: Capabilities = { navLinks: {}, management: {}, catalogue: {} };

/**
 * Service that manages various aspects of the anonymous access.
 */
export class AnonymousAccessService {
  /**
   * Indicates whether anonymous access is enabled.
   */
  private isAnonymousAccessEnabled = false;

  constructor(private readonly logger: Logger, private readonly getConfig: () => ConfigType) {}

  setup() {
    this.isAnonymousAccessEnabled = this.getConfig().authc.sortedProviders.some(
      ({ type }) => type === AnonymousAuthenticationProvider.type
    );
  }

  start({
    basePath,
    capabilities,
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

        if (!this.isAnonymousAccessEnabled) {
          this.logger.warn('Anonymous access is not enabled');
          return DEFAULT_CAPABILITIES;
        }

        // We should use credentials of the anonymous service account instead of credentials of the
        // current user to figure out if the specified Saved Object type can be accessed anonymously.
        const anonymousAuthorizationHeader = this.createAnonymousAuthorizationHeader();
        const fakeAnonymousRequest = KibanaRequest.from(({
          headers: anonymousAuthorizationHeader
            ? { authorization: anonymousAuthorizationHeader.toString() }
            : {},
          // We should pretend that this request is authenticated to force authorization service to
          // perform a privileges check and not to automatically disable all capabilities.
          auth: { isAuthenticated: true },
          path: '/',
          route: { settings: {} },
          url: { href: '/' },
          raw: { req: { url: '/' } },
        } as unknown) as Request);

        const spaceId = spaces?.getSpaceId(request);
        if (spaceId) {
          basePath.set(fakeAnonymousRequest, addSpaceIdToPath('/', spaceId));
        }

        try {
          return await capabilities.resolveCapabilities(fakeAnonymousRequest);
        } catch (err) {
          const errorMessage = getDetailedErrorMessage(err);
          if (getErrorStatusCode(err) === 401) {
            this.logger.warn(`Cannot authenticate anonymous service account: ${errorMessage}`);
            return DEFAULT_CAPABILITIES;
          }

          this.logger.error(
            `Failed to retrieve anonymous service account capabilities: ${errorMessage}`
          );
          throw err;
        }
      },
    };
  }

  /**
   * Creates authorization header that is used to authentication anonymous users.
   */
  private createAnonymousAuthorizationHeader() {
    const config = this.getConfig();
    const anonymousProvider = config.authc.sortedProviders.find(
      ({ type }) => type === AnonymousAuthenticationProvider.type
    );

    return anonymousProvider
      ? AnonymousAuthenticationProvider.createHTTPAuthorizationHeader(
          (config.authc.providers.anonymous![anonymousProvider.name] as Record<string, any>)
            .credentials
        )
      : null;
  }
}
