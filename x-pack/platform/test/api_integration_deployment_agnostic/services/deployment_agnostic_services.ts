/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as apiIntegrationServices } from '../../api_integration/services';

/**
 * Load only services that support both stateful & serverless deployments (including Cloud/MKI),
 * e.g. `randomness` or `retry` are deployment agnostic
 */
export const deploymentAgnosticServices = {
  supertest: apiIntegrationServices.supertest, // TODO: review its behaviour
  es: apiIntegrationServices.es,
  esDeleteAllIndices: apiIntegrationServices.esDeleteAllIndices, // TODO: review its behaviour
  esArchiver: apiIntegrationServices.esArchiver,
  esSupertest: apiIntegrationServices.esSupertest,
  indexPatterns: apiIntegrationServices.indexPatterns,
  ingestPipelines: apiIntegrationServices.ingestPipelines,
  kibanaServer: apiIntegrationServices.kibanaServer,
  randomness: apiIntegrationServices.randomness,
  retry: apiIntegrationServices.retry,
  security: apiIntegrationServices.security,
  usageAPI: apiIntegrationServices.usageAPI,
  spaces: apiIntegrationServices.spaces,
};
