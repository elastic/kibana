/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type {
  IRouter,
  Logger,
  ICustomClusterClient,
  RequestHandlerContext,
  ElasticsearchClient,
} from 'kibana/server';
import type Boom from '@hapi/boom';
import { ElasticsearchClientError, ResponseError } from '@elastic/elasticsearch/lib/errors';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LicenseFeature, ILicense } from '../../licensing/server';
import type {
  PluginStartContract as ActionsPluginsStartContact,
  ActionsApiRequestHandlerContext,
} from '../../actions/server';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';
import type { RacApiRequestHandlerContext } from '../../rule_registry/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerting/server';
import { InfraPluginSetup, InfraRequestHandlerContext } from '../../infra/server';
import { LicensingPluginStart } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { CloudSetup } from '../../cloud/server';
import { ElasticsearchModifiedSource } from '../common/types/es';
import { RulesByType } from '../common/types/alerts';

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
  features: FeaturesPluginSetupContract;
  alerting?: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
  cloud?: CloudSetup;
}

export interface RequestHandlerContextMonitoringPlugin extends RequestHandlerContext {
  actions?: ActionsApiRequestHandlerContext;
  alerting?: AlertingApiRequestHandlerContext;
  infra: InfraRequestHandlerContext;
  ruleRegistry?: RacApiRequestHandlerContext;
}

export interface PluginsStart {
  alerting: AlertingPluginStartContract;
  actions: ActionsPluginsStartContact;
  licensing: LicensingPluginStart;
}

export interface MonitoringCoreConfig {
  get: (key: string) => string | undefined;
}

export interface RouteDependencies {
  cluster: ICustomClusterClient;
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
  esDataClient: ElasticsearchClient;
  kibanaStatsCollector: any;
}

export interface IBulkUploader {
  getKibanaStats: () => any;
  stop: () => void;
  start: (esClient: ElasticsearchClient) => void;
  handleNotEnabled: () => void;
}

export interface MonitoringPluginSetup {
  getKibanaStats: IBulkUploader['getKibanaStats'];
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
  getRulesClient: () => any;
  getActionsClient: () => any;
  server: LegacyServer;
}

export interface LegacyServer {
  log: Logger;
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
      info: {
        getLicenseService: () => MonitoringLicenseService;
      };
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

export type Cluster = ElasticsearchModifiedSource & {
  ml?: { jobs: any };
  logs?: any;
  alerts?: AlertsOnCluster;
};

export interface AlertsOnCluster {
  list: RulesByType;
  alertsMeta: {
    enabled: boolean;
  };
}

export interface Bucket {
  key: string;
  uuids: {
    buckets: unknown[];
  };
}

export interface Aggregation {
  buckets: Bucket[];
}
export interface ClusterSettingsReasonResponse {
  found: boolean;
  reason?: {
    property?: string;
    data?: string;
  };
}

export type ErrorTypes = Error | Boom.Boom | ResponseError | ElasticsearchClientError;
