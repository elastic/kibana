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
  CustomRequestHandlerContext,
  ElasticsearchClient,
} from '@kbn/core/server';
import type Boom from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { TypeOf } from '@kbn/config-schema';
import { LicenseFeature, ILicense } from '@kbn/licensing-plugin/server';
import type {
  PluginStartContract as ActionsPluginsStartContact,
  ActionsApiRequestHandlerContext,
} from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '@kbn/alerting-plugin/server';
import { InfraPluginSetup, InfraRequestHandlerContext } from '@kbn/infra-plugin/server';
import { PluginSetupContract as AlertingPluginSetup } from '@kbn/alerting-plugin/server';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '@kbn/features-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { RouteConfig, RouteMethod, Headers } from '@kbn/core/server';
import { ElasticsearchModifiedSource } from '../common/types/es';
import { RulesByType } from '../common/types/alerts';
import { configSchema, MonitoringConfig } from './config';

export interface MonitoringLicenseService {
  refresh: () => Promise<any>;
  license$: Observable<ILicense>;
  getMessage: () => string | undefined;
  getWatcherFeature: () => LicenseFeature;
  getMonitoringFeature: () => LicenseFeature;
  getSecurityFeature: () => LicenseFeature;
  stop: () => void;
}

export interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  usageCollection?: UsageCollectionSetup;
  features: FeaturesPluginSetupContract;
  alerting?: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
  cloud?: CloudSetup;
}

export type RequestHandlerContextMonitoringPlugin = CustomRequestHandlerContext<{
  actions?: ActionsApiRequestHandlerContext;
  alerting?: AlertingApiRequestHandlerContext;
  infra: InfraRequestHandlerContext;
  ruleRegistry?: RacApiRequestHandlerContext;
}>;

export interface PluginsStart {
  alerting: AlertingPluginStartContract;
  actions: ActionsPluginsStartContact;
  licensing: LicensingPluginStart;
}

export interface RouteDependencies {
  cluster: ICustomClusterClient;
  router: IRouter<RequestHandlerContextMonitoringPlugin>;
  licenseService: MonitoringLicenseService;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  alerting?: AlertingPluginSetup;
  logger: Logger;
}

type LegacyHandler<Params, Query, Body> = (req: LegacyRequest<Params, Query, Body>) => Promise<any>;

export type MonitoringRouteConfig<Params, Query, Body, Method extends RouteMethod> = RouteConfig<
  Params,
  Query,
  Body,
  Method
> & {
  method: Method;
  handler: LegacyHandler<Params, Query, Body>;
};

export interface MonitoringCore {
  config: MonitoringConfig;
  log: Logger;
  route: <Params, Query, Body, Method extends RouteMethod>(
    options: MonitoringRouteConfig<Params, Query, Body, Method>
  ) => void;
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

export interface LegacyRequest<Params = any, Query = any, Body = any> {
  logger: Logger;
  getLogger: (...scopes: string[]) => Logger;
  payload: Body;
  params: Params;
  query: Query;
  headers: Headers;
  getKibanaStatsCollector: () => any;
  getUiSettingsService: () => any;
  getActionTypeRegistry: () => any;
  getRulesClient: () => any;
  getActionsClient: () => any;
  server: LegacyServer;
}

export interface LegacyServer {
  instanceUuid: string;
  log: Logger;
  route: (params: any) => void;
  config: MonitoringConfig;
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
      getCluster: (name: string) => {
        callWithRequest: (req: any, endpoint: string, params: any) => Promise<any>;
      };
    };
  };
}

export type Cluster = Omit<ElasticsearchModifiedSource, 'timestamp'> & {
  timestamp?: string;
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

export type ErrorTypes = Error | Boom.Boom | errors.ResponseError | errors.ElasticsearchClientError;

export type Pipeline = {
  id: string;
  nodeIds: string[];
} & {
  [key in PipelineMetricKey]?: number;
};

export type PipelineMetricKey = PipelineThroughputMetricKey | PipelineNodeCountMetricKey;

export type PipelineThroughputMetricKey =
  | 'logstash_cluster_pipeline_throughput'
  | 'logstash_node_pipeline_throughput';

export type PipelineNodeCountMetricKey =
  | 'logstash_cluster_pipeline_node_count'
  | 'logstash_cluster_pipeline_nodes_count'
  | 'logstash_node_pipeline_node_count'
  | 'logstash_node_pipeline_nodes_count';

export interface PipelineWithMetrics {
  id: string;
  metrics:
    | {
        [key in PipelineMetricKey]: PipelineMetricsProcessed | undefined;
      }
    // backward compat with references that don't properly type the metric keys
    | { [key: string]: PipelineMetricsProcessed | undefined };
}

export interface PipelineResponse {
  id: string;
  latestThroughput: number | null;
  latestNodesCount: number | null;
  metrics: {
    nodesCount?: PipelineMetricsProcessed;
    throughput?: PipelineMetricsProcessed;
  };
}

export interface PipelinesResponse {
  pipelines: PipelineResponse[];
  totalPipelineCount: number;
}

export interface PipelineMetrics {
  bucket_size: string;
  timeRange: {
    min: number;
    max: number;
  };
  metric: {
    app: string;
    field: string;
    label: string;
    description: string;
    units: string;
    format: string;
    hasCalculation: boolean;
    isDerivative: boolean;
  };
}

export type PipelineMetricsRes = PipelineMetrics & {
  data: Array<[number, { [key: string]: number }]>;
};
export type PipelineMetricsProcessed = PipelineMetrics & {
  data: Array<Array<null | number>>;
};

export interface PipelineVersion {
  firstSeen: number;
  lastSeen: number;
  hash: string;
}

export type MonitoringConfigSchema = TypeOf<typeof configSchema>;
