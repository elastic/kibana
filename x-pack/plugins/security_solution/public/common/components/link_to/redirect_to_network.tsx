/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FlowTarget,
  FlowTargetSourceDest,
} from '../../../../common/search_strategy/security_solution/network';

import { appendSearch } from './helpers';

export const getNetworkUrl = (search?: string) => `${appendSearch(search)}`;

export const getNetworkDetailsUrl = (
  detailName: string,
  flowTarget?: FlowTarget | FlowTargetSourceDest,
  search?: string
) => `/ip/${detailName}/${flowTarget || FlowTarget.source}${appendSearch(search)}`;
