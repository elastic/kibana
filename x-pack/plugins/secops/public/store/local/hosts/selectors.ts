/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../../reducer';
import { HostsModel } from './model';

const hostsQuery = (state: State): HostsModel => state.local.hosts;

export const hostsLimitSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.hosts
);

export const eventsLimitSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.events
);

export const uncommonProcessesLimitSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.uncommonProcesses
);
