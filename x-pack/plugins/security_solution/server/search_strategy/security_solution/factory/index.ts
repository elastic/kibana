/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FactoryQueryTypes } from '../../../../common/search_strategy/security_solution';

import { hostsFactory } from './hosts';
import { SecuritySolutionFactory } from './types';

export const securitySolutionFactory: Record<
  FactoryQueryTypes,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  ...hostsFactory,
};
