/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as coreServerlessFunctionalServices } from '@kbn/serverless/test/functional/services';

import { SvlSearchNavigationServiceProvider } from './svl_search_navigation';

export const services = {
  ...coreServerlessFunctionalServices, // includes functional services from x-pack/test/functional

  svlSearchNavigation: SvlSearchNavigationServiceProvider,
};
