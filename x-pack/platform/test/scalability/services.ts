/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

const { es, esArchiver, kibanaServer, retry, supertestWithoutAuth } = commonFunctionalServices;
export const services = {
  es,
  esArchiver,
  kibanaServer,
  retry,
  supertestWithoutAuth,
};
