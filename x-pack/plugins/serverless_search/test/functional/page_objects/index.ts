/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as coreServerlessPageObjects } from '@kbn/serverless/test/functional/page_objects';

import { SvlSearchLandingPageProvider } from './svl_search_landing_page';

export const pageObjects = {
  ...coreServerlessPageObjects, // includes functional page objects from x-pack/test/functional

  svlSearchLandingPage: SvlSearchLandingPageProvider,
};
