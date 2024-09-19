/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './common';
export * from './host_rules';
export * from './host_tactics';
export * from './risk_score';
export * from './user_rules';

export enum UebaQueries {
  hostRules = 'hostRules',
  hostTactics = 'hostTactics',
  riskScore = 'riskScore',
  userRules = 'userRules',
}
