/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateStreamEntitiesManagerAPIKey,
} from './api_key/api_key';
import {
  readStreamEntitiesManagerAPIKey,
  saveStreamEntitiesManagerAPIKey,
  deleteStreamEntitiesManagerAPIKey,
} from './api_key/saved_object';
import {
  canEnableStreamEntitiesManager,
  canManageDefinition,
  canDisableStreamEntitiesManager,
} from './privileges';

export {
  readStreamEntitiesManagerAPIKey,
  saveStreamEntitiesManagerAPIKey,
  deleteStreamEntitiesManagerAPIKey,
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  canEnableStreamEntitiesManager,
  canManageDefinition as canManageStreamEntitiesManagerDefinition,
  canDisableStreamEntitiesManager,
  generateStreamEntitiesManagerAPIKey,
};
