/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import {
  CoreSetup,
  LoggerFactory,
  KibanaRequest,
  IClusterClient,
} from '../../../../../src/core/server';

import { FeaturesService, SpacesService } from '../plugin';
import { Actions } from './actions';
import { CheckPrivilegesWithRequest, checkPrivilegesWithRequestFactory } from './check_privileges';
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
import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { APPLICATION_PREFIX } from '../../common/constants';
import { SecurityLicense } from '../../common/licensing';

export { Actions } from './actions';
export { CheckSavedObjectsPrivileges } from './check_saved_objects_privileges';

interface SetupAuthorizationParams {
  packageVersion: string;
  http: CoreSetup['http'];
  clusterClient: IClusterClient;
  license: SecurityLicense;
  loggers: LoggerFactory;
  featuresService: FeaturesService;
  kibanaIndexName: string;
  getSpacesService(): SpacesService | undefined;
}

export interface Authorization {
  actions: Actions;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  checkPrivilegesDynamicallyWithRequest: CheckPrivilegesDynamicallyWithRequest;
  checkSavedObjectsPrivilegesWithRequest: CheckSavedObjectsPrivilegesWithRequest;
  applicationName: string;
  mode: AuthorizationMode;
  privileges: PrivilegesService;
  disableUnauthorizedCapabilities: (
    request: KibanaRequest,
    capabilities: UICapabilities
  ) => Promise<UICapabilities>;
  registerPrivilegesWithCluster: () => Promise<void>;
}

export function setupAuthorization({
  http,
  packageVersion,
  clusterClient,
  license,
  loggers,
  featuresService,
  kibanaIndexName,
  getSpacesService,
}: SetupAuthorizationParams): Authorization {
  const actions = new Actions(packageVersion);
  const mode = authorizationModeFactory(license);
  const applicationName = `${APPLICATION_PREFIX}${kibanaIndexName}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
    actions,
    clusterClient,
    applicationName
  );
  const privileges = privilegesFactory(actions, featuresService);
  const logger = loggers.get('authorization');

  const authz = {
    actions,
    applicationName,
    checkPrivilegesWithRequest,
    checkPrivilegesDynamicallyWithRequest: checkPrivilegesDynamicallyWithRequestFactory(
      checkPrivilegesWithRequest,
      getSpacesService
    ),
    checkSavedObjectsPrivilegesWithRequest: checkSavedObjectsPrivilegesWithRequestFactory(
      checkPrivilegesWithRequest,
      getSpacesService
    ),
    mode,
    privileges,

    async disableUnauthorizedCapabilities(request: KibanaRequest, capabilities: UICapabilities) {
      // If we have a license which doesn't enable security, or we're a legacy user we shouldn't
      // disable any ui capabilities
      if (!mode.useRbacForRequest(request)) {
        return capabilities;
      }

      const disableUICapabilities = disableUICapabilitiesFactory(
        request,
        featuresService.getFeatures(),
        logger,
        authz
      );

      // if we're an anonymous route, we disable all ui capabilities
      if (request.route.options.authRequired === false) {
        return disableUICapabilities.all(capabilities);
      }

      return await disableUICapabilities.usingPrivileges(capabilities);
    },

    registerPrivilegesWithCluster: async () => {
      validateFeaturePrivileges(actions, featuresService.getFeatures());

      await registerPrivilegesWithCluster(logger, privileges, applicationName, clusterClient);
    },
  };

  initAPIAuthorization(http, authz, loggers.get('api-authorization'));
  initAppAuthorization(http, authz, loggers.get('app-authorization'), featuresService);

  return authz;
}
