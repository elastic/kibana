/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { UsageAPIProvider } from '../../api_integration/services/usage_api';
import { IngestPipelinesProvider } from '../../api_integration/services/ingest_pipelines';
import { SpacesServiceProvider } from '../../api_integration/services/spaces';
import { MachineLearningProvider } from '../../api_integration/services/ml';

/**
 * Load only services that support both stateful & serverless deployments (including Cloud/MKI),
 * e.g. `randomness` or `retry` are deployment agnostic
 */
export const deploymentAgnosticServices = {
  supertest: commonFunctionalServices.supertest,
  es: commonFunctionalServices.es,
  esDeleteAllIndices: commonFunctionalServices.esDeleteAllIndices,
  esArchiver: commonFunctionalServices.esArchiver,
  esSupertest: commonFunctionalServices.esSupertest,
  indexPatterns: commonFunctionalServices.indexPatterns,
  ingestPipelines: IngestPipelinesProvider,
  kibanaServer: commonFunctionalServices.kibanaServer,
  ml: MachineLearningProvider,
  randomness: commonFunctionalServices.randomness,
  retry: commonFunctionalServices.retry,
  security: commonFunctionalServices.security,
  usageAPI: UsageAPIProvider,
  spaces: SpacesServiceProvider,
};
