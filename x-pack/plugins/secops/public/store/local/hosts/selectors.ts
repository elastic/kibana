/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../../reducer';
import { HostsModel } from './model';

const hostsQuery = (state: State): HostsModel => state.local.hosts;

export const authenticationsSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.authentications
);

export const hostsSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.hosts
);

export const eventsSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.events
);

export const uncommonProcessesSelector = createSelector(
  hostsQuery,
  hosts => hosts.query.uncommonProcesses
);
