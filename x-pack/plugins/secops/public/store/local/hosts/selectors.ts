/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../../reducer';
import { InMemoryPaginationQuery } from './model';

const hostsQueryLimit = (state: State): number => state.local.hosts.query.hosts.limit;

const uncommonProcessesQueryLimit = (state: State): InMemoryPaginationQuery =>
  state.local.hosts.query.uncommonProcesses;

export const hostsLimitSelector = createSelector(hostsQueryLimit, limit => limit);

export const uncommonProcessesLimitSelector = createSelector(
  uncommonProcessesQueryLimit,
  objLimit => objLimit
);
