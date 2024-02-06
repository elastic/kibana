/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SCOPE = ['securitySolution'];
export const TYPE = 'entity_store:update_entities';
export const VERSION = '1.0.0';
export const INTERVAL = '30s'; // TODO: change this
export const TIMEOUT = '10m';

export const RISK_SCORING_TASK_CONSTANTS = {
  SCOPE,
  TYPE,
  VERSION,
  INTERVAL,
  TIMEOUT,
};
