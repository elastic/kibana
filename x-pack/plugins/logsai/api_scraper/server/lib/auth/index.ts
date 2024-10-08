/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateApiScraperAPIKey,
} from './api_key/api_key';
import {
  readApiScraperAPIKey,
  saveApiScraperAPIKey,
  deleteApiScraperAPIKey,
} from './api_key/saved_object';
import {
  canEnableApiScraper,
  canManageApiScraperDefinition,
  canDisableApiScraper,
} from './privileges';

export {
  readApiScraperAPIKey,
  saveApiScraperAPIKey,
  deleteApiScraperAPIKey,
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  canEnableApiScraper,
  canManageApiScraperDefinition,
  canDisableApiScraper,
  generateApiScraperAPIKey,
};
