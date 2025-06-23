/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '@kbn/test-suites-src/functional/page_objects';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
};
