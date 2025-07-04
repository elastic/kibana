/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as apiIntegrationServices } from '../../api_integration/services';
import { RoleScopedSupertestProvider } from '../deployment_agnostic/services/role_scoped_supertest';

export const services = {
  es: apiIntegrationServices.es,
  esArchiver: apiIntegrationServices.esArchiver,
  kibanaServer: apiIntegrationServices.kibanaServer,
  retry: apiIntegrationServices.retry,
  supertest: apiIntegrationServices.supertest,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  usageAPI: apiIntegrationServices.usageAPI,
  spaces: apiIntegrationServices.spaces,
  roleScopedSupertest: RoleScopedSupertestProvider,
};
