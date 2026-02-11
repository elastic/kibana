/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformDeploymentAgnosticServices } from '../../api_integration_deployment_agnostic/services';

/**
 * Services common to both API and UI automatic_import_v2 test suites.
 */
export const automaticImportV2CommonServices = {
  ...platformDeploymentAgnosticServices,
};

export type AutomaticImportV2CommonServices = typeof automaticImportV2CommonServices;
