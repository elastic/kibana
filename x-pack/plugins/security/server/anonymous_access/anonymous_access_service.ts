/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Request } from '@hapi/hapi';
import { IBasePath, KibanaRequest, Logger } from '../../../../../src/core/server';
import { addSpaceIdToPath } from '../../../spaces/common';
import type { SpacesServiceStart } from '../../../spaces/server';
import { AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER } from '../../common/constants';
import { AnonymousAuthenticationProvider } from '../authentication';
import type { AuthorizationServiceSetup } from '../authorization';
import type { ConfigType } from '../config';

export interface AnonymousAccessServiceSetup {
  readonly isAnonymousAccessEnabled: boolean;
}

export interface AnonymousAccessServiceStart {
  readonly isAnonymousAccessEnabled: boolean;
  // We cannot use `ReadonlyMap` just yet: https://github.com/microsoft/TypeScript/issues/16840
  readonly accessURLParameters: Readonly<Map<string, string>> | null;
  isSavedObjectTypeAccessibleAnonymously: (
    request: KibanaRequest,
    savedObjectType: string
  ) => Promise<boolean>;
}

interface AnonymousAccessServiceStartParams {
  authz: Pick<AuthorizationServiceSetup, 'actions' | 'checkSavedObjectsPrivilegesWithRequest'>;
  basePath: IBasePath;
  spaces?: SpacesServiceStart;
}

/**
 * Service that manages various aspects of the anonymous access.
 */
export class AnonymousAccessService {
  constructor(private readonly logger: Logger, private readonly getConfig: () => ConfigType) {}

  setup(): AnonymousAccessServiceSetup {
    return {
      isAnonymousAccessEnabled: this.isAnonymousAccessEnabled(),
    };
  }

  start({
    authz,
    basePath,
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
      isAnonymousAccessEnabled: this.isAnonymousAccessEnabled(),
      accessURLParameters:
        anonymousProvider && !anonymousIsDefault
          ? Object.freeze(
              new Map([[AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER, anonymousProvider.name]])
            )
          : null,
      isSavedObjectTypeAccessibleAnonymously: async (request, savedObjectType) => {
        this.logger.debug(`Checking if Saved Object is accessible anonymously.`);

        // We should use credentials of the anonymous service account instead of credentials of the
        // current user to figure out if the specified Saved Object type can be accessed anonymously.
        const anonymousAuthorizationHeader = this.createAnonymousAuthorizationHeader();
        const fakeAnonymousRequest = KibanaRequest.from(({
          headers: anonymousAuthorizationHeader
            ? { authorization: anonymousAuthorizationHeader.toString() }
            : {},
          path: '/',
          route: { settings: {} },
          url: { href: '/' },
          raw: { req: { url: '/' } },
        } as unknown) as Request);

        const spaceId = spaces?.getSpaceId(request);
        if (spaceId) {
          basePath.set(fakeAnonymousRequest, addSpaceIdToPath('/', spaceId));
        }

        const checkPrivileges = authz.checkSavedObjectsPrivilegesWithRequest(fakeAnonymousRequest);
        const { hasAllRequested } = await checkPrivileges(
          authz.actions.savedObject.get(savedObjectType, 'get'),
          spaces && spaceId ? spaces.spaceIdToNamespace(spaceId) : undefined
        );

        if (hasAllRequested) {
          this.logger.debug(
            `Saved Objects with "${savedObjectType}" type can be accessed anonymously.`
          );
        } else {
          this.logger.debug(
            `Saved Objects with "${savedObjectType}" type cannot be accessed anonymously.`
          );
        }

        return hasAllRequested;
      },
    };
  }

  /**
   * Checks whether anonymous access is enabled.
   * @private
   */
  private isAnonymousAccessEnabled() {
    return this.getConfig().authc.sortedProviders.some(
      ({ type }) => type === AnonymousAuthenticationProvider.type
    );
  }

  /**
   * Creates authorization header that is used to authentication anonymous users.
   * @private
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
