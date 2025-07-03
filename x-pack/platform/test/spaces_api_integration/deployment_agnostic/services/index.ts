/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleScopedSupertestProvider } from './role_scoped_supertest';
import { services as apiIntegrationServices } from '../../../api_integration/services';
import { services as deploymentAgnosticServices } from '../../../api_integration_deployment_agnostic/services';

export type { SupertestWithRoleScopeType } from './role_scoped_supertest';

export const services = {
  ...deploymentAgnosticServices,
  usageAPI: apiIntegrationServices.usageAPI,
  spaces: apiIntegrationServices.spaces,
  roleScopedSupertest: RoleScopedSupertestProvider,
};

export type DeploymentAgnosticCommonServices = typeof services;
