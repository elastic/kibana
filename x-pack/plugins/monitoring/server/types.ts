/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type {
  IRouter,
  ILegacyClusterClient,
  Logger,
  ILegacyCustomClusterClient,
  RequestHandlerContext,
} from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LicenseFeature, ILicense } from '../../licensing/server';
import type {
  PluginStartContract as ActionsPluginsStartContact,
  ActionsApiRequestHandlerContext,
} from '../../actions/server';
import type { AlertingApiRequestHandlerContext } from '../../alerts/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerts/server';
import { InfraPluginSetup } from '../../infra/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { CloudSetup } from '../../cloud/server';

export interface MonitoringLicenseService {
  refresh: () => Promise<any>;
  license$: Observable<ILicense>;
  getMessage: () => string | undefined;
  getWatcherFeature: () => LicenseFeature;
  getMonitoringFeature: () => LicenseFeature;
  getSecurityFeature: () => LicenseFeature;
  stop: () => void;
}

export interface MonitoringElasticsearchConfig {
  hosts: string[];
}

export interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  usageCollection?: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetupContract;
  alerts?: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
  cloud?: CloudSetup;
}

export interface RequestHandlerContextMonitoringPlugin extends RequestHandlerContext {
  actions?: ActionsApiRequestHandlerContext;
  alerting?: AlertingApiRequestHandlerContext;
}

export interface PluginsStart {
  alerts: AlertingPluginStartContract;
  actions: ActionsPluginsStartContact;
}

export interface MonitoringCoreConfig {
  get: (key: string) => string | undefined;
}

export interface RouteDependencies {
  cluster: ILegacyCustomClusterClient;
  router: IRouter<RequestHandlerContextMonitoringPlugin>;
  licenseService: MonitoringLicenseService;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  logger: Logger;
}

export interface MonitoringCore {
  config: () => MonitoringCoreConfig;
  log: Logger;
  route: (options: any) => void;
}

export interface LegacyShimDependencies {
  router: IRouter<RequestHandlerContextMonitoringPlugin>;
  instanceUuid: string;
  esDataClient: ILegacyClusterClient;
  kibanaStatsCollector: any;
}

export interface IBulkUploader {
  getKibanaStats: () => any;
  stop: () => void;
}

export interface LegacyRequest {
  logger: Logger;
  getLogger: (...scopes: string[]) => Logger;
  payload: {
    [key: string]: any;
  };
  params: {
    [key: string]: string;
  };
  getKibanaStatsCollector: () => any;
  getUiSettingsService: () => any;
  getActionTypeRegistry: () => any;
  getAlertsClient: () => any;
  getActionsClient: () => any;
  server: LegacyServer;
}

export interface LegacyServer {
  route: (params: any) => void;
  config: () => {
    get: (key: string) => string | undefined;
  };
  newPlatform: {
    setup: {
      plugins: PluginsSetup;
    };
  };
  plugins: {
    monitoring: {
      info: MonitoringLicenseService;
    };
    elasticsearch: {
      getCluster: (
        name: string
      ) => {
        callWithRequest: (req: any, endpoint: string, params: any) => Promise<any>;
      };
    };
  };
}
