/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FactoryQueryTypes,
  UebaQueries,
} from '../../../../../common/search_strategy/security_solution';
import { SecuritySolutionFactory } from '../types';
import { hostRules } from './host_rules';
import { hostTactics } from './host_tactics';
import { riskScore } from './risk_score';
import { userRules } from './user_rules';

export const uebaFactory: Record<UebaQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [UebaQueries.hostRules]: hostRules,
  [UebaQueries.hostTactics]: hostTactics,
  [UebaQueries.riskScore]: riskScore,
  [UebaQueries.userRules]: userRules,
};
