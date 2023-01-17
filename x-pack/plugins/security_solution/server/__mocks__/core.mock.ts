/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See: https://github.com/elastic/kibana/issues/117255, this creates mocks to avoid memory leaks from kibana core.

// We _must_ import from the restricted path or we pull in _everything_ including memory leaks from Kibana core
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';

module.exports = {
  SavedObjectsUtils,
  SavedObjectsErrorHelpers,
};
