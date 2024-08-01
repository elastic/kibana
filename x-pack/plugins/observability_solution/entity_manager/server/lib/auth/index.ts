/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateEntityDiscoveryAPIKey,
} from './api_key/api_key';
import {
  readEntityDiscoveryAPIKey,
  saveEntityDiscoveryAPIKey,
  deleteEntityDiscoveryAPIKey,
} from './api_key/saved_object';
import {
  canEnableEntityDiscovery,
  canManageEntityDefinition,
  canDisableEntityDiscovery,
} from './privileges';

export {
  readEntityDiscoveryAPIKey,
  saveEntityDiscoveryAPIKey,
  deleteEntityDiscoveryAPIKey,
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  canEnableEntityDiscovery,
  canManageEntityDefinition,
  canDisableEntityDiscovery,
  generateEntityDiscoveryAPIKey,
};
