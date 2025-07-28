/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';

import { AiopsProvider } from './aiops';
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';
import { UsageAPIProvider } from './usage_api';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { DataViewApiProvider } from './data_view_api';
import { FleetAndAgentsProvider } from './fleet_and_agents';
import { SpacesServiceProvider } from './spaces';
import { SearchSecureProvider } from './search_secure';
import { TransformProvider } from './transform';
import { IndexManagementProvider } from './index_management';
import { AlertingApiProvider } from './alerting_api';
import { MachineLearningProvider } from './ml';
import { ApmSynthtraceKibanaClientProvider } from './apm_synthtrace_kibana_client';

export const services = {
  ...kibanaApiIntegrationServices,
  aiops: AiopsProvider,
  alertingApi: AlertingApiProvider,
  dataViewApi: DataViewApiProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  indexManagement: IndexManagementProvider,
  ingestPipelines: IngestPipelinesProvider,
  fleetAndAgents: FleetAndAgentsProvider,
  ml: MachineLearningProvider,
  secureSearch: SearchSecureProvider,
  spaces: SpacesServiceProvider,
  transform: TransformProvider,
  usageAPI: UsageAPIProvider,
  apmSynthtraceKibanaClient: ApmSynthtraceKibanaClientProvider,
};
