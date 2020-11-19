/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Subscription, Observable } from 'rxjs';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

import type { Capabilities as UICapabilities } from '../../../../../src/core/types';

import {
  LoggerFactory,
  KibanaRequest,
  ILegacyClusterClient,
  Logger,
  HttpServiceSetup,
  CapabilitiesSetup,
} from '../../../../../src/core/server';

import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../../features/server';

import { SpacesService } from '../plugin';
import { Actions } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import {
  CheckPrivilegesDynamicallyWithRequest,
  checkPrivilegesDynamicallyWithRequestFactory,
} from './check_privileges_dynamically';
import {
  CheckSavedObjectsPrivilegesWithRequest,
  checkSavedObjectsPrivilegesWithRequestFactory,
} from './check_saved_objects_privileges';
import { AuthorizationMode, authorizationModeFactory } from './mode';
import { privilegesFactory, PrivilegesService } from './privileges';
import { initAppAuthorization } from './app_authorization';
import { initAPIAuthorization } from './api_authorization';
import { disableUICapabilitiesFactory } from './disable_ui_capabilities';
import { validateFeaturePrivileges } from './validate_feature_privileges';
import { validateReservedPrivileges } from './validate_reserved_privileges';
import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { APPLICATION_PREFIX } from '../../common/constants';
import { SecurityLicense } from '../../common/licensing';
import { CheckPrivilegesWithRequest } from './types';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import { canRedirectRequest } from '../authentication';
import { ResetSessionPage } from './reset_session_page';
import { AuthenticatedUser } from '..';

export { Actions } from './actions';
export { CheckSavedObjectsPrivileges } from './check_saved_objects_privileges';
export { featurePrivilegeIterator } from './privileges';

interface AuthorizationServiceSetupParams {
  packageVersion: string;
  buildNumber: number;
  http: HttpServiceSetup;
  capabilities: CapabilitiesSetup;
  clusterClient: ILegacyClusterClient;
  license: SecurityLicense;
  loggers: LoggerFactory;
  features: FeaturesPluginSetup;
  kibanaIndexName: string;
  getSpacesService(): SpacesService | undefined;
  getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
}

interface AuthorizationServiceStartParams {
  features: FeaturesPluginStart;
  clusterClient: ILegacyClusterClient;
  online$: Observable<OnlineStatusRetryScheduler>;
}

export interface AuthorizationServiceSetup {
  actions: Actions;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
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
    buildNumber,
    clusterClient,
    license,
    loggers,
    features,
    kibanaIndexName,
    getSpacesService,
    getCurrentUser,
  }: AuthorizationServiceSetupParams): AuthorizationServiceSetup {
    this.logger = loggers.get('authorization');
    this.applicationName = `${APPLICATION_PREFIX}${kibanaIndexName}`;

    const mode = authorizationModeFactory(license);
    const actions = new Actions(packageVersion);
    this.privileges = privilegesFactory(actions, features, license);

    const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
      actions,
      clusterClient,
      this.applicationName
    );

    const authz = {
      actions,
      applicationName: this.applicationName,
      mode,
      privileges: this.privileges,
      checkPrivilegesWithRequest,
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
          return uiCapabilities;
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
      }
    );

    initAPIAuthorization(http, authz, loggers.get('api-authorization'));
    initAppAuthorization(http, authz, loggers.get('app-authorization'), features);

    http.registerOnPreResponse((request, preResponse, toolkit) => {
      if (preResponse.statusCode === 403 && canRedirectRequest(request)) {
        const basePath = http.basePath.get(request);
        const next = `${basePath}${request.url.pathname}${request.url.search}`;
        const regularBundlePath = `${basePath}/${buildNumber}/bundles`;

        const logoutUrl = http.basePath.prepend(
          `/api/security/logout?${querystring.stringify({ next })}`
        );
        const styleSheetPaths = [
          `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
          `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`,
          `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
          `${basePath}/ui/legacy_light_theme.css`,
        ];

        const body = renderToStaticMarkup(
          <ResetSessionPage
            logoutUrl={logoutUrl}
            styleSheetPaths={styleSheetPaths}
            basePath={basePath}
          />
        );

        return toolkit.render({ body, headers: { 'Content-Security-Policy': http.csp.header } });
      }
      return toolkit.next();
    });

    return authz;
  }

  start({ clusterClient, features, online$ }: AuthorizationServiceStartParams) {
    const allFeatures = features.getKibanaFeatures();
    validateFeaturePrivileges(allFeatures);
    validateReservedPrivileges(allFeatures);

    this.statusSubscription = online$.subscribe(async ({ scheduleRetry }) => {
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
    });
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }
}
