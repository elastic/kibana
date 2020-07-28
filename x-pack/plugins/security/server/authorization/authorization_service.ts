/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest, BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { UICapabilities } from 'ui/capabilities';
import {
  LoggerFactory,
  KibanaRequest,
  ILegacyClusterClient,
  ServiceStatusLevels,
  Logger,
  StatusServiceSetup,
  HttpServiceSetup,
  CapabilitiesSetup,
} from '../../../../../src/core/server';

import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../../features/server';

import { SpacesService } from '../plugin';
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
import { validateReservedPrivileges } from './validate_reserved_privileges';
import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { APPLICATION_PREFIX } from '../../common/constants';
import { SecurityLicense } from '../../common/licensing';

export { Actions } from './actions';
export { CheckSavedObjectsPrivileges } from './check_saved_objects_privileges';
export { featurePrivilegeIterator } from './privileges';

interface AuthorizationServiceSetupParams {
  packageVersion: string;
  http: HttpServiceSetup;
  status: StatusServiceSetup;
  capabilities: CapabilitiesSetup;
  clusterClient: ILegacyClusterClient;
  license: SecurityLicense;
  loggers: LoggerFactory;
  features: FeaturesPluginSetup;
  kibanaIndexName: string;
  getSpacesService(): SpacesService | undefined;
}

interface AuthorizationServiceStartParams {
  features: FeaturesPluginStart;
  clusterClient: ILegacyClusterClient;
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
  private license!: SecurityLicense;
  private status!: StatusServiceSetup;
  private applicationName!: string;
  private privileges!: PrivilegesService;

  private statusSubscription?: Subscription;

  setup({
    http,
    capabilities,
    status,
    packageVersion,
    clusterClient,
    license,
    loggers,
    features,
    kibanaIndexName,
    getSpacesService,
  }: AuthorizationServiceSetupParams): AuthorizationServiceSetup {
    this.logger = loggers.get('authorization');
    this.license = license;
    this.status = status;
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
          features.getFeatures(),
          this.logger,
          authz
        );

        if (!request.auth.isAuthenticated) {
          return disableUICapabilities.all(uiCapabilities);
        }

        return await disableUICapabilities.usingPrivileges(uiCapabilities);
      }
    );

    initAPIAuthorization(http, authz, loggers.get('api-authorization'));
    initAppAuthorization(http, authz, loggers.get('app-authorization'), features);

    return authz;
  }

  start({ clusterClient, features }: AuthorizationServiceStartParams) {
    const allFeatures = features.getFeatures();
    validateFeaturePrivileges(allFeatures);
    validateReservedPrivileges(allFeatures);

    this.registerPrivileges(clusterClient);
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }

  private registerPrivileges(clusterClient: ILegacyClusterClient) {
    const RETRY_SCALE_DURATION = 100;
    const RETRY_TIMEOUT_MAX = 10000;
    const retries$ = new BehaviorSubject(0);
    let retryTimeout: NodeJS.Timeout;

    // Register cluster privileges once Elasticsearch is available and Security plugin is enabled.
    this.statusSubscription = combineLatest([
      this.status.core$,
      this.license.features$,
      retries$.asObservable().pipe(
        // We shouldn't emit new value if retry counter is reset. This comparator isn't called for
        // the initial value.
        distinctUntilChanged((prev, curr) => prev === curr || curr === 0)
      ),
    ])
      .pipe(
        filter(
          ([status]) =>
            this.license.isEnabled() && status.elasticsearch.level === ServiceStatusLevels.available
        )
      )
      .subscribe(async () => {
        // If status or license change occurred before retry timeout we should cancel it.
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }

        try {
          await registerPrivilegesWithCluster(
            this.logger,
            this.privileges,
            this.applicationName,
            clusterClient
          );
          retries$.next(0);
        } catch (err) {
          const retriesElapsed = retries$.getValue() + 1;
          retryTimeout = setTimeout(
            () => retries$.next(retriesElapsed),
            Math.min(retriesElapsed * RETRY_SCALE_DURATION, RETRY_TIMEOUT_MAX)
          );
        }
      });
  }
}
