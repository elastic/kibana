/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';

import { services as functionalTestServices } from '../functional/services';
import { services as kibanaApiIntegrationServices } from '../api_integration/services';
import { pageObjects } from '../functional/page_objects';

export const services = {
  ...functionalTestServices,
  supertest: kibanaApiIntegrationServices.supertest,
  esSupertestWithoutAuth: kibanaApiIntegrationServices.esSupertestWithoutAuth,
};

export { pageObjects };

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
