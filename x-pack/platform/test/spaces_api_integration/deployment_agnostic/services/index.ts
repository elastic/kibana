/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesSupertestProvider } from './spaces_supertest';
import { services } from '../../../api_integration_deployment_agnostic/services';
export type { SupertestWithRoleScopeType } from './spaces_supertest';

export const deploymentAgnosticSpacesServices = {
  ...services,
  spacesSupertest: SpacesSupertestProvider,
};

export type DeploymentAgnosticSpacesCommonServices = typeof deploymentAgnosticSpacesServices;
