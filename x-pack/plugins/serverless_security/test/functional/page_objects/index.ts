/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as coreServerlessPageObjects } from '@kbn/serverless/test/functional/page_objects';

import { SvlSecLandingPageProvider } from './svl_sec_landing_page';

export const pageObjects = {
  ...coreServerlessPageObjects, // includes functional page objects from x-pack/test/functional

  svlSecLandingPage: SvlSecLandingPageProvider,
};
