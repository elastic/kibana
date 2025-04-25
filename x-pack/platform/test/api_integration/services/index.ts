/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';

import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';
import { UsageAPIProvider } from './usage_api';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { DataViewApiProvider } from './data_view_api';
import { FleetAndAgents } from './fleet_and_agents';

export const services = {
  ...kibanaApiIntegrationServices,
  dataViewApi: DataViewApiProvider,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ingestPipelines: IngestPipelinesProvider,
  fleetAndAgents: FleetAndAgents,
};
