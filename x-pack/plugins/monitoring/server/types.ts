/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { IRouter, ILegacyClusterClient, Logger } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LicenseFeature, ILicense } from '../../licensing/server';
import { PluginStartContract as ActionsPluginsStartContact } from '../../actions/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerts/server';
import { InfraPluginSetup } from '../../infra/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { CloudSetup } from '../../cloud/server';
import { ElasticsearchSource } from '../common/types/es';

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
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
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

export interface ElasticsearchResponse {
  hits?: {
    hits: ElasticsearchResponseHit[];
    total: {
      value: number;
    };
  };
}

export interface ElasticsearchResponseHit {
  _source: ElasticsearchSource;
  inner_hits?: {
    [field: string]: {
      hits?: {
        hits: ElasticsearchResponseHit[];
        total: {
          value: number;
        };
      };
    };
  };
}
