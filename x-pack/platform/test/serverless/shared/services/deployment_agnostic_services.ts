/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { services as platformApiIntegrationServices } from '../../../api_integration/services';

export const services = {
  // picking only services that work for any FTR config, e.g. 'samlAuth' requires SAML setup in config file
  // common functional services
  console: commonFunctionalServices.console,
  deployment: commonFunctionalServices.deployment,
  es: commonFunctionalServices.es,
  esArchiver: commonFunctionalServices.esArchiver,
  esDeleteAllIndices: commonFunctionalServices.esDeleteAllIndices,
  esSupertest: commonFunctionalServices.esSupertest,
  indexPatterns: commonFunctionalServices.indexPatterns,
  kibanaServer: commonFunctionalServices.kibanaServer,
  randomness: commonFunctionalServices.randomness,
  retry: commonFunctionalServices.retry,
  security: commonFunctionalServices.security,
  supertestWithoutAuth: commonFunctionalServices.supertestWithoutAuth,
  // platform services
  indexManagement: platformApiIntegrationServices.indexManagement,
  ingestPipelines: platformApiIntegrationServices.ingestPipelines,
  ml: platformApiIntegrationServices.ml,
  usageAPI: platformApiIntegrationServices.usageAPI,
};
