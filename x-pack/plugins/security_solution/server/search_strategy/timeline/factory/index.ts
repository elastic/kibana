/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FactoryQueryTypes } from '../../../../common/search_strategy/timeline';

import { timelineDetailsFactory } from './details';
import { SecuritySolutionTimelineFactory } from './types';

export const securitySolutionTimelineFactory: Record<
  FactoryQueryTypes,
  SecuritySolutionTimelineFactory<FactoryQueryTypes>
> = {
  ...timelineDetailsFactory,
};
