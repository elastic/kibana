/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformDeploymentAgnosticServices } from '../../api_integration_deployment_agnostic/services';

/**
 * Services common to both API and UI automatic_import test suites.
 */
export const automaticImportCommonServices = {
  ...platformDeploymentAgnosticServices,
};

export type AutomaticImportCommonServices = typeof automaticImportCommonServices;
