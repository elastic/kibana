/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget, FlowTargetSourceDest } from '../../../graphql/types';

import { appendSearch } from './helpers';

export const getNetworkUrl = (search?: string) => `${appendSearch(search)}`;

export const getIPDetailsUrl = (
  detailName: string,
  flowTarget?: FlowTarget | FlowTargetSourceDest,
  search?: string
) => `/ip/${detailName}/${flowTarget || FlowTarget.source}${appendSearch(search)}`;
