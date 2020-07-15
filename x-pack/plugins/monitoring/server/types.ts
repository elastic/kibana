/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { IRouter, ILegacyClusterClient, Logger } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import { LicenseFeature, ILicense } from '../../licensing/server';
import { PluginStartContract as ActionsPluginsStartContact } from '../../actions/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerts/server';
import { InfraPluginSetup } from '../../infra/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';

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

export interface LegacyAPI {
  getServerStatus: () => string;
}

export interface PluginsSetup {
  telemetryCollectionManager?: TelemetryCollectionManagerPluginSetup;
  usageCollection?: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetupContract;
  alerts: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
}

export interface PluginsStart {
  alerts: AlertingPluginStartContract;
  actions: ActionsPluginsStartContact;
}

export interface MonitoringCoreConfig {
  get: (key: string) => string | undefined;
}

export interface RouteDependencies {
  router: IRouter;
  licenseService: MonitoringLicenseService;
}

export interface MonitoringCore {
  config: () => MonitoringCoreConfig;
  log: Logger;
  route: (options: any) => void;
}

export interface LegacyShimDependencies {
  router: IRouter;
  instanceUuid: string;
  esDataClient: ILegacyClusterClient;
  kibanaStatsCollector: any;
}

export interface IBulkUploader {
  setKibanaStatusGetter: (getter: () => string | undefined) => void;
  getKibanaStats: () => any;
}

export interface LegacyRequest {
  logger: Logger;
  getLogger: (...scopes: string[]) => Logger;
  payload: unknown;
  getKibanaStatsCollector: () => any;
  getUiSettingsService: () => any;
  getActionTypeRegistry: () => any;
  getAlertsClient: () => any;
  getActionsClient: () => any;
  server: {
    config: () => {
      get: (key: string) => string | undefined;
    };
    newPlatform: {
      setup: {
        plugins: PluginsStart;
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
  };
}
