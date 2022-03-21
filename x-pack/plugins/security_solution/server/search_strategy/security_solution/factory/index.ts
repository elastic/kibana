/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FactoryQueryTypes } from '../../../../common/search_strategy/security_solution';
import type { SecuritySolutionFactory } from './types';

import { hostsFactory } from './hosts';
import { matrixHistogramFactory } from './matrix_histogram';
import { networkFactory } from './network';
import { ctiFactoryTypes } from './cti';
import { riskScoreFactory } from './risk_score';
import { usersFactory } from './users';

export const securitySolutionFactory: Record<
  FactoryQueryTypes,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  ...hostsFactory,
  ...usersFactory,
  ...matrixHistogramFactory,
  ...networkFactory,
  ...ctiFactoryTypes,
  ...riskScoreFactory,
};
