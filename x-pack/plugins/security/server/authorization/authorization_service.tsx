/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs';

import type {
  CapabilitiesSetup,
  CustomBrandingSetup,
  HttpServiceSetup,
  IClusterClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
} from '@kbn/core/server';
import type { Capabilities as UICapabilities } from '@kbn/core/types';
import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';
import type {
  AuthorizationMode,
  AuthorizationServiceSetup,
  CheckPrivilegesDynamicallyWithRequest,
  CheckSavedObjectsPrivilegesWithRequest,
  CheckUserProfilesPrivileges,
} from '@kbn/security-plugin-types-server';

import { Actions } from './actions';
import { initAPIAuthorization } from './api_authorization';
import { initAppAuthorization } from './app_authorization';
import { checkPrivilegesFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import { disableUICapabilitiesFactory } from './disable_ui_capabilities';
import { authorizationModeFactory } from './mode';
import type { PrivilegesService } from './privileges';
import { privilegesFactory } from './privileges';
import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { ResetSessionPage } from './reset_session_page';
import { validateFeaturePrivileges } from './validate_feature_privileges';
import { validateReservedPrivileges } from './validate_reserved_privileges';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import { APPLICATION_PREFIX } from '../../common/constants';
import { canRedirectRequest } from '../authentication';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import type { SpacesService } from '../plugin';

export { Actions } from './actions';

interface AuthorizationServiceSetupParams {
  packageVersion: string;
  http: HttpServiceSetup;
  capabilities: CapabilitiesSetup;
  getClusterClient: () => Promise<IClusterClient>;
  license: SecurityLicense;
  loggers: LoggerFactory;
  features: FeaturesPluginSetup;
  kibanaIndexName: string;

  getSpacesService(): SpacesService | undefined;

  getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;

  customBranding: CustomBrandingSetup;
}

interface AuthorizationServiceStartParams {
  features: FeaturesPluginStart;
  clusterClient: IClusterClient;
  online$: Observable<OnlineStatusRetryScheduler>;
}

export interface AuthorizationServiceSetupInternal extends AuthorizationServiceSetup {
  actions: Actions;
  checkUserProfilesPrivileges: (userProfileUids: Set<string>) => CheckUserProfilesPrivileges;
  checkPrivilegesDynamicallyWithRequest: CheckPrivilegesDynamicallyWithRequest;
  checkSavedObjectsPrivilegesWithRequest: CheckSavedObjectsPrivilegesWithRequest;
  applicationName: string;
  mode: AuthorizationMode;
  privileges: PrivilegesService;
}

export class AuthorizationService {
  private logger!: Logger;
  private applicationName!: string;
  private privileges!: PrivilegesService;

  private statusSubscription?: Subscription;

  setup({
    http,
    capabilities,
    packageVersion,
    getClusterClient,
    license,
    loggers,
    features,
    kibanaIndexName,
    getSpacesService,
    getCurrentUser,
    customBranding,
  }: AuthorizationServiceSetupParams): AuthorizationServiceSetupInternal {
    this.logger = loggers.get('authorization');
    this.applicationName = `${APPLICATION_PREFIX}${kibanaIndexName}`;

    const mode = authorizationModeFactory(license);
    const actions = new Actions();
    this.privileges = privilegesFactory(actions, features, license);

    const { checkPrivilegesWithRequest, checkUserProfilesPrivileges } = checkPrivilegesFactory(
      actions,
      getClusterClient,
      this.applicationName
    );

    const authz = {
      actions,
      applicationName: this.applicationName,
      mode,
      privileges: this.privileges,
      checkPrivilegesWithRequest,
      checkUserProfilesPrivileges,
      checkPrivilegesDynamicallyWithRequest: checkPrivilegesDynamicallyWithRequestFactory(
        checkPrivilegesWithRequest,
        getSpacesService
      ),
      checkSavedObjectsPrivilegesWithRequest: checkSavedObjectsPrivilegesWithRequestFactory(
        checkPrivilegesWithRequest,
        getSpacesService
      ),
    };

    capabilities.registerSwitcher(
      async (request: KibanaRequest, uiCapabilities: UICapabilities) => {
        // If we have a license which doesn't enable security, or we're a legacy user we shouldn't
        // disable any ui capabilities
        if (!mode.useRbacForRequest(request)) {
          return {};
        }

        const disableUICapabilities = disableUICapabilitiesFactory(
          request,
          features.getKibanaFeatures(),
          features.getElasticsearchFeatures(),
          this.logger,
          authz,
          getCurrentUser(request)
        );

        if (!request.auth.isAuthenticated) {
          return disableUICapabilities.all(uiCapabilities);
        }

        return await disableUICapabilities.usingPrivileges(uiCapabilities);
      },
      {
        capabilityPath: '*',
      }
    );

    initAPIAuthorization(http, authz, loggers.get('api-authorization'));
    initAppAuthorization(http, authz, loggers.get('app-authorization'), features);

    http.registerOnPreResponse(async (request, preResponse, toolkit) => {
      if (preResponse.statusCode === 403) {
        const user = getCurrentUser(request);
        if (user?.roles.length === 0) {
          this.logger.warn(
            `A user authenticated with the "${user.authentication_realm.name}" (${user.authentication_realm.type}) realm doesn't have any roles and isn't authorized to perform request.`
          );
        }

        if (canRedirectRequest(request)) {
          const customBrandingValue = await customBranding.getBrandingFor(request, {
            unauthenticated: false,
          });
          const next = `${http.basePath.get(request)}${request.url.pathname}${request.url.search}`;
          const body = renderToString(
            <ResetSessionPage
              staticAssets={http.staticAssets}
              basePath={http.basePath}
              logoutUrl={http.basePath.prepend(
                `/api/security/logout?${querystring.stringify({ next })}`
              )}
              customBranding={customBrandingValue}
            />
          );

          return toolkit.render({
            body,
            headers: {
              'Content-Security-Policy': http.csp.header,
              'Content-Security-Policy-Report-Only': http.csp.reportOnlyHeader,
            },
          });
        }
      }

      return toolkit.next();
    });

    return authz;
  }

  start({ clusterClient, features, online$ }: AuthorizationServiceStartParams) {
    const allFeatures = features.getKibanaFeatures();
    validateFeaturePrivileges(allFeatures);
    validateReservedPrivileges(allFeatures);

    this.statusSubscription = online$
      .pipe(
        switchMap(async ({ scheduleRetry }) => {
          try {
            await registerPrivilegesWithCluster(
              this.logger,
              this.privileges,
              this.applicationName,
              clusterClient
            );
          } catch (err) {
            scheduleRetry();
          }
        })
      )
      .subscribe();
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }
}
